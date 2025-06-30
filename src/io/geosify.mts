/**
 * @file
 * # Geosify - GeoJSON to GEOS conversion overview
 *
 * The main idea behind this custom GeoJSON integration is to improve
 * the efficiency of importing data into Wasm by reducing unnecessary copies
 * and memory allocations. The Wasm-side implementation of this integration
 * operates directly on the memory of created coordinate sequences, bypassing
 * GEOS C-API. The entire process of importing data from GeoJSON consists of
 * the following steps:
 *
 * ## 1. [JS] measure and validate GeoJSON geometries
 * Measure how big the buffer needs to be to include all necessary information
 * about a given set of geometries. Verify the validity of provided geometries
 * to simplify the error handling done by Wasm.
 *
 * ## 2. [JS] encode data of GeoJSON geometries
 * Encode the basic information about the geometries. The resulting buffer
 * consists of three parts `D`, `S` and `F`:
 * - `D` - a sequence of `u32` numbers which are a numerical recipe for the
 *   creation of a given set of geometries.\
 *   A single geometry is defined by a sequence of `u32` numbers, starting with
 *   a header specifying the type of geometry and its dimension (whether it has
 *   a Z coordinate). The next numbers depend on the type of geometry. In the case
 *   of LineString it will be the number of its points, and in the case of Polygon
 *   it will be the number of its rings and the length of each ring. This is somewhat
 *   similar to WKB but stores the `u32` and `f64` values in separate continuous
 *   buffers that keep the data properly aligned, which speeds up writing and reading.
 * - `S` - a sequence of `u32` numbers which are the pointers to
 *   `GEOSCoordSequence` underlying data
 * - `F` - a sequence of `f64` numbers which are the concatenated coordinates
 *   of all (Multi)Point geometries
 * <pre>
 * // example of a buffer describing MultiPolygon, Point and LineString
 * D meta  (u32) 10 -> number of records in `D` part
 * S meta  (u32) 4 -> number of records in `S` part
 * D       (u32) 6 -> geometry header - MultiPolygon XY [<type>0110 <isEmpty>0 <hasZ>0]
 * D       (u32) └─ 2 -> number of sub-polygons
 * D       (u32)    ├─ 2 -> number of rings in the first sub-polygon
 * D       (u32)    │  ├─ 4 -> number of coordinates in the first sub-polygon exterior ring
 * D       (u32)    │  └─ 6 -> number of coordinates in the first sub-polygon first interior ring
 * D       (u32)    └─ 1 -> number of rings in the second sub-polygon
 * D       (u32)       └─ 5 -> number of coordinates in the second sub-polygon exterior ring
 * D       (u32) 0 -> geometry header - Point XY [<type>0000 <isEmpty>0 <hasZ>0]
 * D       (u32) 33 -> geometry header - LineString XYZ [<type>0001 <isEmpty>0 <hasZ>1]
 * D       (u32) └─ 8 -> number of coordinates
 * S       (u32) blank
 * S       (u32) blank
 * S       (u32) blank
 * S       (u32) blank
 * F       (f64) some x -> point x coordinate
 * F       (f64) some y -> point y coordinate
 * </pre>
 *
 * ## 3. [Wasm] create blank instances of `GEOSCoordSequence`
 * `geosify_geomsCoords` initializes `GEOSCoordSequence` with the specified dimensions.
 * <pre>
 * // continuation of the above example, `geosify_geomsCoords` will modify `S` and partially `D`
 * D       (u32) 6
 * D       (u32) └─ 2
 * D       (u32)    ├─ 2
 * D      *(u32)    │  ├─ *GEOSCoordSequence -> pointer to the GEOSCoordSequence XY*4
 * D      *(u32)    │  └─ *GEOSCoordSequence -> CS XY*6
 * D       (u32)    └─ 1
 * D      *(u32)       └─ *GEOSCoordSequence -> CS XY*5
 * D       (u32) 0
 * D       (u32) 33
 * D      *(u32) └─ *GEOSCoordSequence -> CS XYZ*8
 * S      *(u32) *f64 -> pointer to the data of GEOSCoordSequence XY*4
 * S      *(u32) *f64 -> CS XY*6
 * S      *(u32) *f64 -> CS XY*5
 * S      *(u32) *f64 -> CS XYZ*8
 * </pre>
 *
 * ## 4. [JS] populate blank `GEOSCoordSequence` with data of GeoJSON geometries directly
 *
 * ## 5. [Wasm] create instances of `GEOSGeometry`
 * Based on the `D` part of the buffer and the already populated `GEOSCoordSequence`s,
 * `geosify_geoms` creates corresponding `GEOSGeometry` instances.
 * <pre>
 * // continuation of the above example, `D` part is replaced by a list of `GEOSGeometry` pointers
 * D      *(u32) *GEOSGeometry -> pointer to the created GEOS MultiPolygon
 * D      *(u32) *GEOSGeometry -> pointer to the created GEOS Point
 * D      *(u32) *GEOSGeometry -> pointer to the created GEOS LineString
 * </pre>
 *
 * ## 6. [JS] retrieve pointers of `GEOSGeometry`
 */
declare const THIS_FILE: symbol; // to omit ^ @file doc from the bundle

import type { Feature as GeoJSON_Feature, Geometry as GeoJSON_Geometry } from 'geojson';
import type { GEOSGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry, type GeometryExtras } from '../geom/Geometry.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


export class InvalidGeoJSONError extends GEOSError {
    /** @internal */
    constructor(geom: GeoJSON_Geometry, invalidType?: boolean) {
        super(`Invalid ${invalidType ? 'GeoJSON geometry' : geom.type}: ${JSON.stringify(geom)}`);
        this.name = 'InvalidGeoJSONError';
    }
}


interface GeosifyCounter {
    d: number; // number of records in `D` (geometry set data)
    s: number; // number of records in `S` (`GEOSCoordSequence` that need to be created)
    f: number; // number of records in `F` (embedded coordinates of (Multi)Points)
}

const geosifyMeasureAndValidateGeom = (geom: GeoJSON_Geometry, c: GeosifyCounter): void => {
    switch (geom?.type) {

        case 'Point': {
            const pt = geom.coordinates;
            const dim = pt.length > 2 ? 3 : 2;
            c.f += dim;
            c.d += 1; // [header]
            return;
        }

        case 'MultiPoint' : {
            const pts = geom.coordinates;
            const dim = pts[ 0 ]?.length > 2 ? 3 : 2;
            c.f += pts.length * dim;
            c.d += 2; // [header][numPoints]
            return;
        }

        case 'LineString': {
            const pts = geom.coordinates;
            if (pts.length === 1) {
                throw new InvalidGeoJSONError(geom);
            }
            c.s += 1; // [cs->data]
            c.d += 2; // [header][cs->size/ptr]
            return;
        }

        case 'Polygon': {
            const ppts = geom.coordinates;
            const pptsLength = ppts.length;
            for (const pts of ppts) {
                const ptsLength = pts.length;
                const f = pts[ 0 ], l = pts[ ptsLength - 1 ];
                if (ptsLength && (ptsLength < 3 || f[ 0 ] !== l[ 0 ] || f[ 1 ] !== l[ 1 ])) {
                    throw new InvalidGeoJSONError(geom);
                }
            }
            c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
            c.d += 2 + pptsLength; // [header][numRings] [R1:cs->size/ptr]…[RN:cs->size/ptr]
            return;
        }

        case 'MultiLineString': {
            const ppts = geom.coordinates;
            const pptsLength = ppts.length;
            for (const pts of ppts) {
                if (pts.length === 1) {
                    throw new InvalidGeoJSONError(geom);
                }
            }
            c.s += pptsLength; // [L1:cs->data]…[LN:cs->data]
            c.d += 2 + pptsLength; // [header][numLines] [L1:cs->size/ptr]…[LN:cs->size/ptr]
            return;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            c.d += 2 + pppts.length; // [header][numPolygons] [P1:numRings]…[PN:numRings]
            for (const ppts of pppts) {
                const pptsLength = ppts.length;
                for (const pts of ppts) {
                    const ptsLength = pts.length;
                    const f = pts[ 0 ], l = pts[ ptsLength - 1 ];
                    if (ptsLength && (ptsLength < 3 || f[ 0 ] !== l[ 0 ] || f[ 1 ] !== l[ 1 ])) {
                        throw new InvalidGeoJSONError(geom);
                    }
                }
                c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
                c.d += pptsLength; // [R1:cs->size/ptr]…[RN:cs->size/ptr]
            }
            return;
        }

        case 'GeometryCollection': {
            const geoms = geom.geometries;
            for (const g of geoms) {
                geosifyMeasureAndValidateGeom(g, c);
            }
            c.d += 2; // [header][numGeometries]
            return;
        }

    }

    throw new InvalidGeoJSONError(geom, true);
};


interface GeosifyEncodeState {
    B: Uint32Array;
    d: number; // `D` iterator
    F: Float64Array;
    f: number; // `F` iterator
}

const geosifyEncodeGeom = (geom: GeoJSON_Geometry, s: GeosifyEncodeState): void => {
    const { B, F } = s;
    let { d, f } = s;
    switch (geom.type) {

        case 'Point': {
            const pt = geom.coordinates;
            const dim = pt.length;
            // B[ b++ ] = typeId | (isEmpty << 4) | (+hasZ << 5);
            if (dim) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                if (dim > 2) {
                    F[ f++ ] = pt[ 2 ];
                    B[ d++ ] = 32; // typeId | (0 << 4) | (1 << 5)
                } else {
                    B[ d++ ] = 0; // typeId | (0 << 4) | (0 << 5)
                }
            } else {
                B[ d++ ] = 16; // typeId | (1 << 4) | (0 << 5)
            }
            break;
        }

        case 'MultiPoint': {
            const pts = geom.coordinates;
            const hasZ = pts[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 36 : 4; // typeId | (+hasZ << 5);
            B[ d++ ] = pts.length;
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                if (hasZ) {
                    F[ f++ ] = pt[ 2 ];
                }
            }
            break;
        }

        case 'LineString': {
            const pts = geom.coordinates;
            const hasZ = pts[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 33 : 1; // typeId | (+hasZ << 5);
            B[ d++ ] = pts.length;
            break;
        }

        case 'Polygon': {
            const ppts = geom.coordinates;
            const hasZ = ppts[ 0 ]?.[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 35 : 3; // typeId | (+hasZ << 5);
            B[ d++ ] = ppts.length;
            for (const pts of ppts) {
                B[ d++ ] = pts.length;
            }
            break;
        }

        case 'MultiLineString': {
            const ppts = geom.coordinates;
            const hasZ = ppts[ 0 ]?.[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 37 : 5; // typeId | (+hasZ << 5);
            B[ d++ ] = ppts.length;
            for (const pts of ppts) {
                B[ d++ ] = pts.length;
            }
            break;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            const hasZ = pppts[ 0 ]?.[ 0 ]?.[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 38 : 6; // typeId | (+hasZ << 5);
            B[ d++ ] = pppts.length;
            for (const ppts of pppts) {
                B[ d++ ] = ppts.length;
                for (const pts of ppts) {
                    B[ d++ ] = pts.length;
                }
            }
            break;
        }

        case 'GeometryCollection': {
            const geoms = geom.geometries;
            B[ s.d++ ] = 7;
            B[ s.d++ ] = geoms.length;
            for (const g of geoms) {
                geosifyEncodeGeom(g, s);
            }
            return;
        }

    }
    s.f = f;
    s.d = d;
};


interface GeosifyPopulateState {
    B: Uint32Array;
    s: number; // `S` iterator
    F: Float64Array;
}

const geosifyPopulateGeom = (geom: GeoJSON_Geometry, s: GeosifyPopulateState): void => {
    const { B, F } = s;
    switch (geom.type) {

        // Point & MultiPoint - skip

        case 'LineString': {
            const pts = geom.coordinates;
            let f = B[ s.s++ ];
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = pt.length > 2 ? pt[ 2 ] : NaN;
            }
            break;
        }

        case 'Polygon':
        case 'MultiLineString': {
            const ppts = geom.coordinates;
            for (const pts of ppts) {
                let f = B[ s.s++ ];
                for (const pt of pts) {
                    F[ f++ ] = pt[ 0 ];
                    F[ f++ ] = pt[ 1 ];
                    F[ f++ ] = pt.length > 2 ? pt[ 2 ] : NaN;
                }
            }
            break;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            for (const ppts of pppts) {
                for (const pts of ppts) {
                    let f = B[ s.s++ ];
                    for (const pt of pts) {
                        F[ f++ ] = pt[ 0 ];
                        F[ f++ ] = pt[ 1 ];
                        F[ f++ ] = pt.length > 2 ? pt[ 2 ] : NaN;
                    }
                }
            }
            break;
        }

        case 'GeometryCollection': {
            const geoms = geom.geometries;
            for (const g of geoms) {
                geosifyPopulateGeom(g, s);
            }
        }

    }
};


/**
 * Creates a {@link Geometry} from GeoJSON geometry object.
 *
 * @param geojson - GeoJSON geometry object
 * @param extras - Optional geometry extras
 * @returns A new geometry
 * @throws {InvalidGeoJSONError} on invalid GeoJSON geometry
 *
 * @example
 * const pt = geosifyGeometry({ type: 'Point', coordinates: [ 1, 1 ] });
 * const line = geosifyGeometry({ type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] });
 * const collection = geosifyGeometry({
 *     type: 'GeometryCollection',
 *     geometries: [
 *         { type: 'Point', coordinates: [ 1, 1 ] },
 *         { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *     ],
 * });
 * pt.type; // 'Point'
 * line.type; // 'LineString'
 * collection.type; // 'GeometryCollection'
 */
export function geosifyGeometry<P>(geojson: GeoJSON_Geometry, extras?: GeometryExtras<P>): Geometry<P> {
    const c: GeosifyCounter = { d: 0, s: 0, f: 0 };
    geosifyMeasureAndValidateGeom(geojson, c);
    const buff = geos.buffByL4(3 + c.d + c.s + c.f * 2);
    try {
        let B = geos.U32;
        let d = buff.i4, s: number, f: number;
        B[ d++ ] = c.d;
        B[ d++ ] = c.s;
        s = d + c.d;
        f = Math.ceil((s + c.s) / 2);

        const es: GeosifyEncodeState = { B, d, F: geos.F64, f };
        geosifyEncodeGeom(geojson, es);

        if (c.s) {
            geos.geosify_geomsCoords(buff[ POINTER ]);
            const ps: GeosifyPopulateState = { B: geos.U32, s, F: geos.F64 };
            geosifyPopulateGeom(geojson, ps);
        }

        geos.geosify_geoms(buff[ POINTER ]);

        B = geos.U32;
        return new Geometry(
            B[ d ] as Ptr<GEOSGeometry>,
            geojson.type,
            extras,
        );
    } finally {
        buff.freeIfTmp();
    }
}

/**
 * Creates an array of {@link Geometry} from an array of GeoJSON feature objects.
 *
 * @param geojsons - Array of GeoJSON feature objects
 * @returns An array of new geometries
 * @throws {InvalidGeoJSONError} on GeoJSON feature without geometry
 * @throws {InvalidGeoJSONError} on invalid GeoJSON geometry
 *
 * @example
 * const [ pt, line, collection ] = geosifyFeatures([
 *     {
 *         type: 'Feature',
 *         geometry: { type: 'Point', coordinates: [ 1, 1 ] },
 *         properties: null,
 *     },
 *     {
 *         type: 'Feature',
 *         geometry: { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *         properties: null,
 *     },
 *     {
 *         type: 'Feature',
 *         geometry: {
 *             type: 'GeometryCollection',
 *             geometries: [
 *                 { type: 'Point', coordinates: [ 1, 1 ] },
 *                 { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *             ],
 *         },
 *         properties: null,
 *     },
 * ]);
 * pt.type; // 'Point'
 * line.type; // 'LineString'
 * collection.type; // 'GeometryCollection'
 */
export function geosifyFeatures<P>(geojsons: GeoJSON_Feature<GeoJSON_Geometry, P>[]): Geometry<P>[] {
    const c: GeosifyCounter = { d: 0, s: 0, f: 0 };
    for (const geom of geojsons) {
        geosifyMeasureAndValidateGeom(geom.geometry, c);
    }
    const buff = geos.buffByL4(3 + c.d + c.s + c.f * 2);
    try {
        let B = geos.U32;
        let d = buff.i4, s: number, f: number;
        B[ d++ ] = c.d;
        B[ d++ ] = c.s;
        s = d + c.d;
        f = Math.ceil((s + c.s) / 2);

        const es: GeosifyEncodeState = { B, d, F: geos.F64, f };
        for (const geom of geojsons) {
            geosifyEncodeGeom(geom.geometry, es);
        }

        if (c.s) {
            geos.geosify_geomsCoords(buff[ POINTER ]);
            const ps: GeosifyPopulateState = { B: geos.U32, s, F: geos.F64 };
            for (const geom of geojsons) {
                geosifyPopulateGeom(geom.geometry, ps);
            }
        }

        geos.geosify_geoms(buff[ POINTER ]);

        B = geos.U32;
        const geometriesLength = geojsons.length;
        const geosGeometries = Array<Geometry<P>>(geometriesLength);
        for (let i = 0; i < geometriesLength; i++) {
            const feature = geojsons[ i ];
            geosGeometries[ i ] = new Geometry(
                B[ d++ ] as Ptr<GEOSGeometry>,
                feature.geometry.type,
                feature,
            );
        }
        return geosGeometries;
    } finally {
        buff.freeIfTmp();
    }
}
