#define GEOS_USE_ONLY_R_API 1

#include <cstring>
#include <geos.h>
#include <geos/geom/CompoundCurve.h>
#include <geos/geom/CurvePolygon.h>
#include <geos_c.h>
#include <vector>
#include <wasi/api.h>


typedef uint32_t u32;
typedef double f64;
typedef uintptr_t uptr;

extern "C" {
/* ******************************************** *
 * Geosify: GeoJSON to GEOS
 * ******************************************** */

struct GeosifyCoordsState {
    u32 *D; // [in/out] Array<u32> geometry data (header, sizes)
    u32 d;
    u32 *S; // [out] Array<*f64> sequences
    u32 s;
};

void geosify_coords(GeosifyCoordsState *s, const bool hasZ, const bool hasM) {
    const u32 ptsLength = s->D[s->d];
    const CoordinateSequence *cs = new CoordinateSequence(ptsLength, hasZ, hasM, false);
    s->D[s->d++] = (uptr) cs;
    s->S[s->s++] = (uptr) cs->data() / 8;
}

void geosify_geomCoords(GeosifyCoordsState *s) {
    const u32 header = s->D[s->d++];
    const u32 type = header & 15;
    const bool hasZ = header >> 5 & 1;
    const bool hasM = header >> 6 & 1;

    switch ((GeometryTypeId) type) {
        case GeometryTypeId::GEOS_LINESTRING:
        case GeometryTypeId::GEOS_CIRCULARSTRING: {
            geosify_coords(s, hasZ, hasM);
            break;
        }

        case GeometryTypeId::GEOS_POLYGON:
        case GeometryTypeId::GEOS_MULTILINESTRING: {
            const u32 pptsLength = s->D[s->d++];
            for (u32 i = 0; i < pptsLength; ++i) {
                geosify_coords(s, hasZ, hasM);
            }
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOINT: {
            s->d++; // skip points length
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOLYGON: {
            const u32 ppptsLength = s->D[s->d++];
            for (u32 j = 0; j < ppptsLength; ++j) {
                const u32 pptsLength = s->D[s->d++];
                for (u32 i = 0; i < pptsLength; ++i) {
                    geosify_coords(s, hasZ, hasM);
                }
            }
            break;
        }

        case GeometryTypeId::GEOS_GEOMETRYCOLLECTION:
        case GeometryTypeId::GEOS_COMPOUNDCURVE:
        case GeometryTypeId::GEOS_CURVEPOLYGON:
        case GeometryTypeId::GEOS_MULTICURVE:
        case GeometryTypeId::GEOS_MULTISURFACE: {
            const u32 geometriesLength = s->D[s->d++];
            for (u32 i = 0; i < geometriesLength; ++i) {
                geosify_geomCoords(s);
            }
            break;
        }

        case GeometryTypeId::GEOS_POINT:
        case GeometryTypeId::GEOS_LINEARRING: {
            break; // Point ignore; LinearRing should never happen
        }
    }
}

void geosify_geomsCoords(u32 *buff) {
    const u32 dLength = buff[0];
    u32 *D = buff + 2;
    u32 *S = D + dLength;

    GeosifyCoordsState s = {D, 0, S, 0};

    while (s.d < dLength) {
        geosify_geomCoords(&s);
    }
}


struct GeosifyState {
    u32 *D;
    u32 d;
    const f64 *F;
    u32 f;
};

GEOSGeometry *geosify_point(GEOSContextHandle_t ctx, GeosifyState *s, const bool hasZ, const bool hasM) {
    if (hasZ || hasM) {
        CoordinateSequence *cs = new CoordinateSequence(1, hasZ, hasM, false);
        std::memcpy(cs->data(), s->F + s->f, 24 + hasM * 8);
        s->f += 3 + hasM;
        return GEOSGeom_createPoint_r(ctx, (GEOSCoordSequence *) cs);
    }
    return GEOSGeom_createPointFromXY_r(ctx, s->F[s->f++], s->F[s->f++]);
}

GEOSGeometry *geosify_lineString(GEOSContextHandle_t ctx, GeosifyState *s) {
    return GEOSGeom_createLineString_r(ctx, (GEOSCoordSequence *) s->D[s->d++]);
}

GEOSGeometry *geosify_polygon(GEOSContextHandle_t ctx, GeosifyState *s) {
    const u32 pptsLength = s->D[s->d++];
    if (!pptsLength) {
        return GEOSGeom_createEmptyPolygon_r(ctx);
    }
    GEOSGeometry *rings[pptsLength];
    for (u32 i = 0; i < pptsLength; ++i) {
        rings[i] = GEOSGeom_createLinearRing_r(ctx, (GEOSCoordSequence *) s->D[s->d++]);
    }
    return GEOSGeom_createPolygon_r(ctx, rings[0], rings + 1, pptsLength - 1);
}

GEOSGeometry *geosify_circularString(GEOSContextHandle_t ctx, GeosifyState *s) {
    return GEOSGeom_createCircularString_r(ctx, (GEOSCoordSequence *) s->D[s->d++]);
}

GEOSGeometry *geosify_geom(GEOSContextHandle_t ctx, GeosifyState *s) {
    const u32 header = s->D[s->d++];
    const u32 type = header & 15;

    switch ((GeometryTypeId) type) {
        case GeometryTypeId::GEOS_POINT: {
            const bool isEmpty = header >> 4 & 1;
            if (isEmpty) {
                return GEOSGeom_createEmptyPoint_r(ctx);
            }
            const bool hasZ = header >> 5 & 1;
            const bool hasM = header >> 6 & 1;
            return geosify_point(ctx, s, hasZ, hasM);
        }

        case GeometryTypeId::GEOS_LINESTRING: {
            return geosify_lineString(ctx, s);
        }

        case GeometryTypeId::GEOS_POLYGON: {
            return geosify_polygon(ctx, s);
        }

        case GeometryTypeId::GEOS_MULTIPOINT: {
            const u32 pointsLength = s->D[s->d++];
            if (!pointsLength) {
                return GEOSGeom_createEmptyCollection_r(ctx, GeometryTypeId::GEOS_MULTIPOINT);
            }
            const bool hasZ = header >> 5 & 1;
            const bool hasM = header >> 6 & 1;
            GEOSGeometry *points[pointsLength];
            for (u32 i = 0; i < pointsLength; ++i) {
                points[i] = geosify_point(ctx, s, hasZ, hasM);
            }
            return GEOSGeom_createCollection_r(ctx, GeometryTypeId::GEOS_MULTIPOINT, points, pointsLength);
        }

        case GeometryTypeId::GEOS_MULTILINESTRING: {
            const u32 linesLength = s->D[s->d++];
            if (!linesLength) {
                return GEOSGeom_createEmptyCollection_r(ctx, GeometryTypeId::GEOS_MULTILINESTRING);
            }
            GEOSGeometry *lines[linesLength];
            for (u32 i = 0; i < linesLength; ++i) {
                lines[i] = geosify_lineString(ctx, s);
            }
            return GEOSGeom_createCollection_r(ctx, GeometryTypeId::GEOS_MULTILINESTRING, lines, linesLength);
        }

        case GeometryTypeId::GEOS_MULTIPOLYGON: {
            const u32 polygonsLength = s->D[s->d++];
            if (!polygonsLength) {
                return GEOSGeom_createEmptyCollection_r(ctx, GeometryTypeId::GEOS_MULTIPOLYGON);
            }
            GEOSGeometry *polygons[polygonsLength];
            for (u32 i = 0; i < polygonsLength; ++i) {
                polygons[i] = geosify_polygon(ctx, s);
            }
            return GEOSGeom_createCollection_r(ctx, GeometryTypeId::GEOS_MULTIPOLYGON, polygons, polygonsLength);
        }

        case GeometryTypeId::GEOS_CIRCULARSTRING: {
            return geosify_circularString(ctx, s);
        }

        case GeometryTypeId::GEOS_COMPOUNDCURVE: {
            const u32 segmentsLength = s->D[s->d++];
            if (!segmentsLength) {
                return GEOSGeom_createEmptyCompoundCurve_r(ctx);
            }
            GEOSGeometry *segments[segmentsLength];
            for (u32 i = 0; i < segmentsLength; ++i) {
                segments[i] = geosify_geom(ctx, s);
            }
            return GEOSGeom_createCompoundCurve_r(ctx, segments, segmentsLength);
        }

        case GeometryTypeId::GEOS_CURVEPOLYGON: {
            const u32 ringsLength = s->D[s->d++];
            if (!ringsLength) {
                return GEOSGeom_createEmptyCurvePolygon_r(ctx);
            }
            GEOSGeometry *rings[ringsLength];
            for (u32 i = 0; i < ringsLength; ++i) {
                rings[i] = geosify_geom(ctx, s);
            }
            return GEOSGeom_createCurvePolygon_r(ctx, rings[0], rings + 1, ringsLength - 1);
        }

        case GeometryTypeId::GEOS_GEOMETRYCOLLECTION:
        case GeometryTypeId::GEOS_MULTICURVE:
        case GeometryTypeId::GEOS_MULTISURFACE: {
            const u32 geometriesLength = s->D[s->d++];
            if (!geometriesLength) {
                return GEOSGeom_createEmptyCollection_r(ctx, (int) type);
            }
            GEOSGeometry *geometries[geometriesLength];
            for (u32 i = 0; i < geometriesLength; ++i) {
                geometries[i] = geosify_geom(ctx, s);
            }
            return GEOSGeom_createCollection_r(ctx, (int) type, geometries, geometriesLength);
        }

        case GeometryTypeId::GEOS_LINEARRING: {
            return nullptr; // LinearRing should never happen
        }
    }
}

void geosify_geoms_r(GEOSContextHandle_t ctx, u32 *buff) {
    const u32 dLength = buff[0];
    const u32 sLength = buff[1];
    u32 *D = buff + 2;
    const f64 *F = (f64 *) buff + (dLength + sLength + 3) / 2;

    GeosifyState s = {D, 0, F, 0};

    for (u32 o = 0; s.d < dLength; ++o) {
        D[o] = (uptr) geosify_geom(ctx, &s);
    }
}


/* ******************************************** *
 * Jsonify: GEOS to GeoJSON
 * ******************************************** */

void jsonify_measureGeom(const Geometry *geom_cpp, u32 *b, u32 *f) {
    switch (geom_cpp->getGeometryTypeId()) {
        case GeometryTypeId::GEOS_POINT: {
            *b += 1; // [header]
            *f += geom_cpp->isEmpty() ? 0 : geom_cpp->hasM() ? 4 : geom_cpp->hasZ() ? 3 : 2;
            break;
        }

        case GeometryTypeId::GEOS_LINESTRING:
        case GeometryTypeId::GEOS_LINEARRING:
        case GeometryTypeId::GEOS_CIRCULARSTRING: {
            *b += 3; // [header][cs->size][cs->data]
            break;
        }

        case GeometryTypeId::GEOS_POLYGON: {
            const Surface *polygon = (Surface *) geom_cpp;
            const size_t interiorRingsLength = polygon->getNumInteriorRing();
            *b += 4 + interiorRingsLength * 2; // [header][numRings] [R1:cs->size][R1:cs->data]…[RN:cs->size][RN:cs->data]
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOINT: {
            const MultiPoint *multiPoint = (MultiPoint *) geom_cpp;
            const size_t pointsLength = multiPoint->getNumGeometries();
            *b += 2; // [header][numPoints]
            *f += pointsLength * (geom_cpp->hasM() ? 4 : geom_cpp->hasZ() ? 3 : 2);
            break;
        }

        case GeometryTypeId::GEOS_MULTILINESTRING: {
            const MultiLineString *multiLine = (MultiLineString *) geom_cpp;
            const size_t linesLength = multiLine->getNumGeometries();
            *b += 2 + linesLength * 2; // [header][numLines] [L1:cs->size][L1:cs->data]…[LN:cs->size][LN:cs->data]
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOLYGON: {
            const MultiPolygon *multiPolygon = (MultiPolygon *) geom_cpp;
            const size_t polygonsLength = multiPolygon->getNumGeometries();
            *b += 2; // [header][numPolygons]
            for (size_t i = 0; i < polygonsLength; ++i) {
                const Surface *polygon = multiPolygon->getGeometryN(i);
                const size_t interiorRingsLength = polygon->getNumInteriorRing();
                // TODO invalid?
                *b += 3 + interiorRingsLength * 2; // [numRings] [R1:cs->size][R1:cs->data]…[RN:cs->size][RN:cs->data]
            }
            break;
        }

        case GeometryTypeId::GEOS_GEOMETRYCOLLECTION:
        case GeometryTypeId::GEOS_MULTICURVE:
        case GeometryTypeId::GEOS_MULTISURFACE: {
            const GeometryCollection *collection = (GeometryCollection *) geom_cpp;
            const size_t geometriesLength = collection->getNumGeometries();
            *b += 2; // [header][numGeometries]
            for (size_t i = 0; i < geometriesLength; ++i) {
                jsonify_measureGeom(collection->getGeometryN(i), b, f);
            }
            break;
        }

        case GeometryTypeId::GEOS_COMPOUNDCURVE: {
            const CompoundCurve *compoundCurve = (CompoundCurve *) geom_cpp;
            const size_t segmentsLength = compoundCurve->getNumCurves();
            *b += 2; // [header][numSegments]
            for (size_t i = 0; i < segmentsLength; ++i) {
                jsonify_measureGeom(compoundCurve->getCurveN(i), b, f);
            }
            break;
        }

        case GeometryTypeId::GEOS_CURVEPOLYGON: {
            const CurvePolygon *curvePolygon = (CurvePolygon *) geom_cpp;
            const size_t interiorRingsLength = curvePolygon->getNumInteriorRing();
            *b += 2; // [header][numRings]
            jsonify_measureGeom(curvePolygon->getExteriorRing(), b, f);
            for (size_t i = 0; i < interiorRingsLength; ++i) {
                jsonify_measureGeom(curvePolygon->getInteriorRingN(i), b, f);
            }
            break;
        }
    }
}

void jsonify_inspectPoint(const Point *point, const bool hasZ, const bool hasM, f64 *F, u32 *f) {
    const CoordinateSequence *cs = point->getCoordinatesRO();
    const u32 n = hasM ? 4 : hasZ ? 3 : 2;
    std::memcpy(F + *f, cs->data(), n * 8);
    *f += n;
}

void jsonify_inspectCurve(const SimpleCurve *curve, u32 *B, u32 *b) {
    const CoordinateSequence *cs = curve->getCoordinatesRO();
    B[(*b)++] = cs->getSize();
    B[(*b)++] = (uptr) cs->data() / 8;
}

void jsonify_inspectPolygon(const Polygon *polygon, u32 *B, u32 *b) {
    const size_t interiorRingsLength = polygon->getNumInteriorRing();
    B[(*b)++] = (u32) interiorRingsLength + 1;
    jsonify_inspectCurve(polygon->getExteriorRing(), B, b);
    for (size_t i = 0; i < interiorRingsLength; ++i) {
        jsonify_inspectCurve(polygon->getInteriorRingN(i), B, b);
    }
}

void jsonify_inspectGeom(const Geometry *geom_cpp, u32 *B, u32 *b, f64 *F, u32 *f) {
    const GeometryTypeId type = geom_cpp->getGeometryTypeId();
    const bool isEmpty = geom_cpp->isEmpty();
    const bool hasZ = geom_cpp->hasZ();
    const bool hasM = geom_cpp->hasM();

    B[(*b)++] = type | isEmpty << 4 | hasZ << 5 | hasM << 6; // header

    if (isEmpty) {
        return;
    }

    switch (type) {
        case GeometryTypeId::GEOS_POINT: {
            const Point *point = (Point *) geom_cpp;
            jsonify_inspectPoint(point, hasZ, hasM, F, f);
            break;
        }

        case GeometryTypeId::GEOS_LINESTRING:
        case GeometryTypeId::GEOS_LINEARRING:
        case GeometryTypeId::GEOS_CIRCULARSTRING: {
            const SimpleCurve *curve = (SimpleCurve *) geom_cpp;
            jsonify_inspectCurve(curve, B, b);
            break;
        }

        case GeometryTypeId::GEOS_POLYGON: {
            const Polygon *polygon = (Polygon *) geom_cpp;
            jsonify_inspectPolygon(polygon, B, b);
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOINT: {
            const MultiPoint *multiPoint = (MultiPoint *) geom_cpp;
            const size_t pointsLength = multiPoint->getNumGeometries();
            B[(*b)++] = (u32) pointsLength;
            for (size_t i = 0; i < pointsLength; ++i) {
                jsonify_inspectPoint(multiPoint->getGeometryN(i), hasZ, hasM, F, f);
            }
            break;
        }

        case GeometryTypeId::GEOS_MULTILINESTRING: {
            const MultiLineString *multiLine = (MultiLineString *) geom_cpp;
            const size_t linesLength = multiLine->getNumGeometries();
            B[(*b)++] = (u32) linesLength;
            for (size_t i = 0; i < linesLength; ++i) {
                jsonify_inspectCurve(multiLine->getGeometryN(i), B, b);
            }
            break;
        }

        case GeometryTypeId::GEOS_MULTIPOLYGON: {
            const MultiPolygon *multiPolygon = (MultiPolygon *) geom_cpp;
            const size_t polygonsLength = multiPolygon->getNumGeometries();
            B[(*b)++] = (u32) polygonsLength;
            for (size_t i = 0; i < polygonsLength; ++i) {
                jsonify_inspectPolygon(multiPolygon->getGeometryN(i), B, b);
            }
            break;
        }

        case GeometryTypeId::GEOS_GEOMETRYCOLLECTION:
        case GeometryTypeId::GEOS_MULTICURVE:
        case GeometryTypeId::GEOS_MULTISURFACE: {
            const GeometryCollection *collection = (GeometryCollection *) geom_cpp;
            const size_t geometriesLength = collection->getNumGeometries();
            B[(*b)++] = (u32) geometriesLength;
            for (size_t i = 0; i < geometriesLength; ++i) {
                jsonify_inspectGeom(collection->getGeometryN(i), B, b, F, f);
            }
            break;
        }

        case GeometryTypeId::GEOS_COMPOUNDCURVE: {
            const CompoundCurve *compoundCurve = (CompoundCurve *) geom_cpp;
            const size_t segmentsLength = compoundCurve->getNumCurves();
            B[(*b)++] = (u32) segmentsLength;
            for (size_t i = 0; i < segmentsLength; ++i) {
                jsonify_inspectGeom(compoundCurve->getCurveN(i), B, b, F, f);
            }
            break;
        }

        case GeometryTypeId::GEOS_CURVEPOLYGON: {
            const CurvePolygon *curvePolygon = (CurvePolygon *) geom_cpp;
            const size_t interiorRingsLength = curvePolygon->getNumInteriorRing();
            B[(*b)++] = (u32) interiorRingsLength + 1;
            jsonify_inspectGeom(curvePolygon->getExteriorRing(), B, b, F, f);
            for (size_t i = 0; i < interiorRingsLength; ++i) {
                jsonify_inspectGeom(curvePolygon->getInteriorRingN(i), B, b, F, f);
            }
            break;
        }
    }
}

void jsonify_geoms(u32 *buff) {
    const u32 geomsLength = buff[1];
    const Geometry **geoms_cpp = (const Geometry **) buff + 2;
    const u32 buffAvailableL4 = buff[2 + geomsLength];

    u32 bCount = 0, fCount = 0;
    for (u32 i = 0; i < geomsLength; ++i) {
        jsonify_measureGeom(geoms_cpp[i], &bCount, &fCount);
    }

    u32 *B;
    f64 *F;
    if (bCount + fCount * 2 > buffAvailableL4) {
        // allocate new tmp output buffer
        bCount += bCount % 2; // ensure 8 byte alignment for F
        u32 *tmpOutBuff = (u32 *) malloc(bCount * 4 + fCount * 8);
        buff[0] = (uptr) tmpOutBuff; // save tmp [out] buffer ptr in [in] buffer
        B = tmpOutBuff;
        F = (f64 *) tmpOutBuff + bCount / 2;
    } else {
        // use input buffer
        u32 o = 2 + geomsLength;
        B = buff + o;
        F = (f64 *) buff + (o + bCount + 1) / 2;
    }
    buff[1] = (uptr) F / 8; // save F index in [in] buffer

    u32 b = 0, f = 0;
    for (u32 i = 0; i < geomsLength; ++i) {
        jsonify_inspectGeom(geoms_cpp[i], B, &b, F, &f);
    }
}


/* ******************************************** *
 * STRtree
 * ******************************************** */

struct STRtree {
    GEOSSTRtree *tree;
    GEOSGeometry **geoms;
};

STRtree *STRtree_create_r(GEOSContextHandle_t ctx, GEOSGeometry **geoms, u32 ngeoms, u32 nodeCapacity) {
    GEOSSTRtree *tree = GEOSSTRtree_create_r(ctx, nodeCapacity);
    for (u32 i = 0; i < ngeoms; ++i) {
        // tree item is geometry index, not a pointer to anything
        GEOSSTRtree_insert_r(ctx, tree, geoms[i], (void *) i);
    }
    GEOSSTRtree_build_r(ctx, tree);
    return new STRtree{tree, geoms};
}

void STRtree_destroy_r(GEOSContextHandle_t ctx, STRtree *tree) {
    GEOSSTRtree_destroy_r(ctx, tree->tree);
    free(tree->geoms);
    delete tree;
}


void queryCallback(void *item, void *userdata) {
    std::vector<u32> *matches = (std::vector<u32> *) userdata;
    matches->push_back((uptr) item); // item is geometry index
}

u32 *STRtree_query_r(GEOSContextHandle_t ctx, STRtree *tree, GEOSGeometry *geom, u32 *matchesLength) {
    std::vector</* geometry index */u32> matches;
    GEOSSTRtree_query_r(ctx, tree->tree, geom, queryCallback, &matches);

    const u32 n = matches.size();
    *matchesLength = n;
    if (n) {
        u32 *arr = (u32 *) malloc(n * sizeof(u32)); // caller must free
        std::memcpy(arr, matches.data(), n * sizeof(u32));
        return arr;
    }
    return nullptr;
}


struct STRtreeNearestState {
    GEOSContextHandle_t ctx;
    GEOSGeometry **geoms;
    bool allMatches = false; // whether to return all equally distant neighbors, not just the first one
    f64 minDistance = geos::DoubleInfinity;
    std::vector</* geometry index */u32> matches;
};

int distanceCallback(const void *item1, const void *item2, double *distance, void *userdata) {
    STRtreeNearestState *s = (STRtreeNearestState *) userdata;
    u32 treeGeomIndex = (uptr) item1;
    GEOSGeometry *treeGeom = s->geoms[treeGeomIndex];
    GEOSGeometry *queryGeom = (GEOSGeometry *) item2;

    double dist;
    GEOSDistance_r(s->ctx, queryGeom, treeGeom, &dist);

    if (dist < s->minDistance) {
        s->minDistance = dist;
        s->matches.clear();
    }
    if (dist == s->minDistance) {
        s->matches.push_back(treeGeomIndex);
        if (s->allMatches) {
            // *taken from shapely:
            // to force GEOS to check all geometries that may have an equally small distance
            dist += 1e-6;
        }
    }

    *distance = dist;
    return 1;
}

u32 STRtree_nearest_r(GEOSContextHandle_t ctx, STRtree *tree, GEOSGeometry *geom, u32 *matchesLength) {
    STRtreeNearestState s = {ctx, tree->geoms};
    GEOSSTRtree_nearest_generic_r(ctx, tree->tree, geom, geom, distanceCallback, &s);

    const u32 n = s.matches.size();
    *matchesLength = n;
    if (n) {
        return s.matches.front();
    }
    return 0;
}

u32 *STRtree_nearestAll_r(GEOSContextHandle_t ctx, STRtree *tree, GEOSGeometry *geom, u32 *matchesLength) {
    STRtreeNearestState s = {ctx, tree->geoms, true};
    GEOSSTRtree_nearest_generic_r(ctx, tree->tree, geom, geom, distanceCallback, &s);

    const u32 n = s.matches.size();
    *matchesLength = n;
    if (n) {
        u32 *arr = (u32 *) malloc(n * sizeof(u32)); // caller must free
        std::memcpy(arr, s.matches.data(), n * sizeof(u32));
        return arr;
    }
    return nullptr;
}
}


/* ******************************************** *
 * I have no idea why emscripten needs those as imports
 * by declaring them here .wasm file no longer asks to import them
 *
 * `-sEVAL_CTORS=2` does not help to get rid of `__wasi_environ`
 * when `-sSTANDALONE_WASM=1`
 * ******************************************** */

/**
 * Close a file descriptor.
 * Note: This is similar to `close` in POSIX.
 */
__wasi_errno_t __wasi_fd_close(__wasi_fd_t fd) {
    return __WASI_ERRNO_NOSYS;
}

/** Return command-line argument data sizes. */
__wasi_errno_t __wasi_environ_sizes_get(
    /** The number of arguments. */
    __wasi_size_t *argc,
    /** The size of the argument string data. */
    __wasi_size_t *argv_buf_size
) {
    *argc = 0;
    *argv_buf_size = 0;
    return __WASI_ERRNO_SUCCESS;
}

/**
 * Read environment variable data.
 * The sizes of the buffers should match that returned by `environ_sizes_get`.
 */
__wasi_errno_t __wasi_environ_get(
    uint8_t * *environ,
    uint8_t *environ_buf
) {
    return __WASI_ERRNO_SUCCESS;
}
