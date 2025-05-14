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

import type { Geometry as GeoJSONGeometry, GeometryCollection, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'geojson';
import type { GEOSGeometry, Ptr } from '../types/wasm-geos.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry, GEOSGeometryTypeDecoder } from '../geom/geometry.mjs';
import { GeosError } from '../core/geos-error.mjs';
import { geos } from '../core/geos.mjs';


interface GEOSGeometryType {
    Point: 0,
    LineString: 1,
    '': 2,
    Polygon: 3,
    MultiPoint: 4,
    MultiLineString: 5,
    MultiPolygon: 6,
    GeometryCollection: 7,
}

const GEOSGeometryType: GEOSGeometryType = GEOSGeometryTypeDecoder.reduce((a, t, i) => (a[ t ] = i, a), {} as any);


export class InvalidGeoJSONError extends GeosError {
    /** @internal */
    constructor(type: number, geom: GeoJSONGeometry) {
        super(`Invalid ${GEOSGeometryTypeDecoder[ type ]} ${JSON.stringify(geom)}`);
    }
}


interface GeosifyCounter {
    d: number; // number of records in `D` (geometry set data)
    s: number; // number of records in `S` (`GEOSCoordSequence` that need to be created)
    f: number; // number of records in `F` (embedded coordinates of (Multi)Points)
}

const geosifyMeasureAndValidateGeom = (geom: GeoJSONGeometry, c: GeosifyCounter): void => {
    const type = GEOSGeometryType[ geom.type ];
    switch (type) {

        case 0: { // Point
            const pt = (geom as Point).coordinates;
            const dim = pt.length > 2 ? 3 : 2;
            c.f += dim;
            c.d += 1; // [header]
            break;
        }

        case 4 : { // MultiPoint
            const pts = (geom as MultiPoint).coordinates;
            const dim = pts[ 0 ]?.length > 2 ? 3 : 2;
            c.f += pts.length * dim;
            c.d += 2; // [header][numPoints]
            break;
        }

        case 1: { // LineString
            const pts = (geom as LineString).coordinates;
            if (pts.length === 1) {
                throw new InvalidGeoJSONError(type, geom);
            }
            c.s += 1; // [cs->data]
            c.d += 2; // [header][cs->size/ptr]
            break;
        }

        case 3: { // Polygon
            const ppts = (geom as Polygon).coordinates;
            const pptsLength = ppts.length;
            for (const pts of ppts) {
                const ptsLength = pts.length;
                const f = pts[ 0 ], l = pts[ ptsLength - 1 ];
                if (ptsLength && (ptsLength < 3 || f[ 0 ] !== l[ 0 ] || f[ 1 ] !== l[ 1 ])) {
                    throw new InvalidGeoJSONError(type, geom);
                }
            }
            c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
            c.d += 2 + pptsLength; // [header][numRings] [R1:cs->size/ptr]…[RN:cs->size/ptr]
            break;
        }

        case 5: { // MultiLineString
            const ppts = (geom as MultiLineString).coordinates;
            const pptsLength = ppts.length;
            for (const pts of ppts) {
                if (pts.length === 1) {
                    throw new InvalidGeoJSONError(type, geom);
                }
            }
            c.s += pptsLength; // [L1:cs->data]…[LN:cs->data]
            c.d += 2 + pptsLength; // [header][numLines] [L1:cs->size/ptr]…[LN:cs->size/ptr]
            break;
        }

        case 6: { // MultiPolygon
            const pppts = (geom as MultiPolygon).coordinates;
            c.d += 2 + pppts.length; // [header][numPolygons] [P1:numRings]…[PN:numRings]
            for (const ppts of pppts) {
                const pptsLength = ppts.length;
                for (const pts of ppts) {
                    const ptsLength = pts.length;
                    const f = pts[ 0 ], l = pts[ ptsLength - 1 ];
                    if (ptsLength && (ptsLength < 3 || f[ 0 ] !== l[ 0 ] || f[ 1 ] !== l[ 1 ])) {
                        throw new InvalidGeoJSONError(type, geom);
                    }
                }
                c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
                c.d += pptsLength; // [R1:cs->size/ptr]…[RN:cs->size/ptr]
            }
            break;
        }

        case 7: { // GeometryCollection
            const geoms = (geom as GeometryCollection).geometries;
            for (const g of geoms) {
                geosifyMeasureAndValidateGeom(g, c);
            }
            c.d += 2; // [header][numGeometries]
            break;
        }

        default: {
            throw new GeosError(`Unexpected geometry type. Expected one of [${GEOSGeometryTypeDecoder.slice(0, 2)},${GEOSGeometryTypeDecoder.slice(3, 8)}] received "${geom.type}"`);
        }

    }
};


interface GeosifyEncodeState {
    B: Uint32Array;
    d: number; // `D` iterator
    F: Float64Array;
    f: number; // `F` iterator
}

const geosifyEncodeGeom = (geom: GeoJSONGeometry, s: GeosifyEncodeState): void => {
    const { B, F } = s;
    let { d, f } = s;
    const type = GEOSGeometryType[ geom.type ];
    switch (type) {

        case 0: { // Point
            const pt = (geom as Point).coordinates;
            const dim = pt.length;
            // B[ b++ ] = type | (isEmpty << 4) | (+hasZ << 5);
            if (dim) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                if (dim > 2) {
                    F[ f++ ] = pt[ 2 ];
                    B[ d++ ] = 32; // type | (0 << 4) | (1 << 5)
                } else {
                    B[ d++ ] = 0; // type | (0 << 4) | (0 << 5)
                }
            } else {
                B[ d++ ] = 16; // type | (1 << 4) | (0 << 5)
            }
            break;
        }

        case 4 : { // MultiPoint
            const pts = (geom as MultiPoint).coordinates;
            const hasZ = pts[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 36 : 4; // type | (+hasZ << 5);
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

        case 1: { // LineString
            const pts = (geom as LineString).coordinates;
            const hasZ = pts[ 0 ]?.length > 2;
            B[ d++ ] = hasZ ? 33 : 1; // type | (+hasZ << 5);
            B[ d++ ] = pts.length;
            break;
        }

        case 3: // Polygon
        case 5: { // MultiLineString
            const ppts = (geom as Polygon | MultiLineString).coordinates;
            const hasZ = ppts[ 0 ]?.[ 0 ]?.length > 2;
            B[ d++ ] = type | (+hasZ << 5);
            B[ d++ ] = ppts.length;
            for (const pts of ppts) {
                B[ d++ ] = pts.length;
            }
            break;
        }

        case 6: { // MultiPolygon
            const pppts = (geom as MultiPolygon).coordinates;
            const hasZ = pppts[ 0 ]?.[ 0 ]?.[ 0 ]?.length > 2;
            B[ d++ ] = type | (+hasZ << 5);
            B[ d++ ] = pppts.length;
            for (const ppts of pppts) {
                B[ d++ ] = ppts.length;
                for (const pts of ppts) {
                    B[ d++ ] = pts.length;
                }
            }
            break;
        }

        case 7: { // GeometryCollection
            const geoms = (geom as GeometryCollection).geometries;
            B[ s.d++ ] = type;
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

const geosifyPopulateGeom = (geom: GeoJSONGeometry, s: GeosifyPopulateState): void => {
    const { B, F } = s;
    const type = GEOSGeometryType[ geom.type ];
    switch (type) {

        // Point & MultiPoint - skip

        case 1: { // LineString
            const pts = (geom as LineString).coordinates;
            let f = B[ s.s++ ];
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = pt.length > 2 ? pt[ 2 ] : NaN;
            }
            break;
        }

        case 3: // Polygon
        case 5: { // MultiLineString
            const ppts = (geom as Polygon | MultiLineString).coordinates;
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

        case 6: { // MultiPolygon
            const pppts = (geom as MultiPolygon).coordinates;
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

        case 7: { // GeometryCollection
            const geoms = (geom as GeometryCollection).geometries;
            for (const g of geoms) {
                geosifyPopulateGeom(g, s);
            }
        }

    }
};


/**
 * Converts provided GeoJSON geometry into GEOS geometry.
 *
 * @param geojson - GeoJSON geometry to be converted into GEOS geometry
 * @throws InvalidGeoJSONError on invalid geometry
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
 * pt.type(); // 'Point'
 * line.type(); // 'LineString'
 * collection.type(); // 'GeometryCollection'
 */
export function geosifyGeometry(geojson: GeoJSONGeometry): Geometry {
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
        return new Geometry(B[ d ] as Ptr<GEOSGeometry>);
    } finally {
        buff.freeIfTmp();
    }
}

/**
 * Converts provided array of GeoJSON geometries into an array of GEOS geometries.
 *
 * @param geojsons - array of GeoJSON geometries to be converted into an array of GEOS geometries
 * @throws InvalidGeoJSONError on invalid geometry
 *
 * @example
 * const geometries = geosifyGeometries([
 *     { type: 'Point', coordinates: [ 1, 1 ] },
 *     { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *     {
 *         type: 'GeometryCollection',
 *         geometries: [
 *             { type: 'Point', coordinates: [ 1, 1 ] },
 *             { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *         ],
 *     }
 * ]);
 * geometries[ 0 ].type(); // 'Point'
 * geometries[ 1 ].type(); // 'LineString'
 * geometries[ 2 ].type(); // 'GeometryCollection'
 */
export function geosifyGeometries(geojsons: GeoJSONGeometry[]): Geometry[] {
    const c: GeosifyCounter = { d: 0, s: 0, f: 0 };
    for (const geom of geojsons) {
        geosifyMeasureAndValidateGeom(geom, c);
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
            geosifyEncodeGeom(geom, es);
        }

        if (c.s) {
            geos.geosify_geomsCoords(buff[ POINTER ]);
            const ps: GeosifyPopulateState = { B: geos.U32, s, F: geos.F64 };
            for (const geom of geojsons) {
                geosifyPopulateGeom(geom, ps);
            }
        }

        geos.geosify_geoms(buff[ POINTER ]);

        B = geos.U32;
        const geometriesLength = geojsons.length;
        const geosGeometries = Array<Geometry>(geometriesLength);
        for (let i = 0; i < geometriesLength; i++) {
            geosGeometries[ i ] = new Geometry(B[ d++ ] as Ptr<GEOSGeometry>);
        }
        return geosGeometries;
    } finally {
        buff.freeIfTmp();
    }
}
