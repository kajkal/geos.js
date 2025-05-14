import type { Position } from 'geojson';
import { FINALIZATION, POINTER } from '../core/symbols.mjs';
import { Geometry, GEOSGeometryTypeDecoder } from '../geom/geometry.mjs';
import { geosifyGeometry } from '../io/geosify.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Creates a GEOS point geometry from a position.
 *
 * @param pt - Point coordinates
 * @returns A new point Geometry object
 *
 * @example
 * const geom = point([ 1, 1 ]);
 * toWKT(geom); // 'POINT (1 1)'
 */
export function point(pt: Position): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 0 ], coordinates: pt });
}

/**
 * Creates a GEOS line string geometry from an array of positions.
 * Line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param pts - LineString coordinates
 * @returns A new Geometry object
 * @throws InvalidGeoJSONError on line with 1 position
 * @example
 * const geom = lineString([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ]);
 * toWKT(geom); // 'LINESTRING (0 0, 1 1, 2 2)'
 */
export function lineString(pts: Position[]): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 1 ], coordinates: pts });
}

/**
 * Creates a GEOS polygon geometry from an array of linear rings coordinates.
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param ppts - Polygon coordinates
 * @returns A new Geometry object
 * @throws InvalidGeoJSONError if any ring is invalid (not closed or with 1 or 2 positions)
 *
 * @example
 * const geom = polygon([ [ [ 0, 0 ], [ 0, 2 ], [ 2, 2 ], [ 2, 0 ], [ 0, 0 ] ] ]);
 * toWKT(geom); // 'POLYGON ((0 0, 0 2, 2 2, 2 0, 0 0))'
 */
export function polygon(ppts: Position[][]): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 3 ], coordinates: ppts });
}


/**
 * Creates a GEOS multipoint geometry from an array of positions.
 *
 * @param pts - MultiPoint coordinates
 * @returns A new Geometry object
 *
 * @example
 * const geom = multiPoint([ [ 1, 1 ], [ 2, 2 ], [ 3, 3 ] ]);
 * toWKT(geom); // 'MULTIPOINT ((1 1), (2 2), (3 3))'
 */
export function multiPoint(pts: Position[]): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 4 ], coordinates: pts });
}

/**
 * Creates a GEOS multiline string geometry from an array of line strings coordinates.
 * Each line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param ppts - MultiLineString coordinates
 * @returns A new Geometry object
 * @throws InvalidGeoJSONError on line with 1 position
 *
 * @example
 * const geom = multiLineString([
 *     [ [ 0, 0 ], [ 1, 1 ] ],
 *     [ [ 2, 2 ], [ 3, 3 ] ]
 * ]);
 * toWKT(geom); // 'MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))'
 */
export function multiLineString(ppts: Position[][]): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 5 ], coordinates: ppts });
}

/**
 * Creates a GEOS multipolygon geometry from an array of polygon coordinates.
 * Each polygon must consist of an array of linear rings coordinates.
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param pppts - MultiPolygon coordinates
 * @returns A new Geometry object
 * @throws InvalidGeoJSONError if any ring is invalid (not closed or with 1 or 2 positions)
 *
 * @example
 * const geom = multiPolygon([
 *     [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ],
 *     [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 3, 2 ], [ 2, 2 ] ] ]
 * ]);
 * toWKT(geom); // 'MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)), ((2 2, 2 3, 3 3, 3 2, 2 2)))'
 */
export function multiPolygon(pppts: Position[][][]): Geometry {
    return geosifyGeometry({ type: GEOSGeometryTypeDecoder[ 6 ], coordinates: pppts });
}

/**
 * Creates a GEOS geometry collection from an array of GEOS geometries.
 * The collection consumes the input geometries - after creating
 * the collection, the input geometries become {@link Geometry#detached|detached},
 * are no longer valid and should **not** be used.
 *
 * @param geometries - Array of geometry objects to be included in the collection
 * @returns A new GeometryCollection containing all input geometries
 *
 * @example
 * const g1 = point([ 1, 1 ]);
 * const g2 = lineString([ [ 0, 0 ], [ 2, 2 ] ]);
 * const collection = geometryCollection([ g1, g2 ]);
 * toWKT(collection); // 'GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 2 2))'
 */
export function geometryCollection(geometries: Geometry[]): Geometry {
    const geometriesLength = geometries.length;
    const buff = geos.buffByL4(geometriesLength);
    try {
        let B = geos.U32, b = buff.i4;
        for (const geometry of geometries) {
            B[ b++ ] = geometry[ POINTER ];
        }
        const geomPtr = geos.GEOSGeom_createCollection(7, buff[ POINTER ], geometriesLength);
        for (const geometry of geometries) {
            Geometry[ FINALIZATION ].unregister(geometry);
            geometry.detached = true;
        }
        return new Geometry(geomPtr);
    } finally {
        buff.freeIfTmp();
    }
}
