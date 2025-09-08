/**
 * @file
 * # Jsonify - GEOS to GeoJSON conversion overview
 *
 * Geometries provide pointers to the underlying data of their coordinate
 * sequences which the JS side reads without the need for additional copies.
 * The coordinates of the Point and MultiPoint geometries are first copied
 * into a single sequential buffer, as this helps to speed up their reading
 * by the JS side (less fragmentation).
 *
 * A list of pointers of the GEOS geometries to jsonify is prepared in an
 * input buffer. The first 2 elements of this buffer are special:
 * - `buff[0]` -> JS side sets this to `0` if Wasm side changes it, it means
 *   that the input buffer was too small and a new temporary output buffer
 *   was created and the value of `buff[0]` is the pointer to it.
 * - `buff[1]` -> Wasm side will put here the pointer (starting index) to the
 *   buffer with the concatenated coordinates of all (Multi)Point geometries.
 *
 * The output buffer contains the geometry data (is empty, has Z, has M) with
 * pointers to underlying data of their coordinate sequences.
 */
declare const THIS_FILE: symbol; // to omit ^ @file doc from the bundle

import type { Position } from 'geojson';
import type { Ptr, u32 } from '../core/types/WasmGEOS.mjs';
import type { JSON_Feature, JSON_Geometry } from '../geom/types/JSON.mjs';
import { POINTER } from '../core/symbols.mjs';
import { CollectionElementsKeyMap, type CoordinateType, type Geometry, GeometryRef, GEOSGeometryTypeDecoder } from '../geom/Geometry.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


interface OutputCoordsOptions {
    /** read single point */
    P: (F: Float64Array, f: number, hasZ: 0 | 1, hasM: 0 | 1) => Position;
    /** read coordinate sequence */
    C: (F: Float64Array, l: number, f: number, hasZ: 0 | 1, hasM: 0 | 1) => Position[];
}

const CoordsOptionsMap: Record<CoordinateType, OutputCoordsOptions> = {
    XY: {
        P: (F, f) => (
            [ F[ f ], F[ f + 1 ] ]
        ),
        C: (F, l, f, _hasZ, hasM) => {
            const stride = 3 + hasM;
            const pts = Array<Position>(l);
            for (let i = 0; i < l; i++, f += stride) {
                pts[ i ] = [ F[ f ], F[ f + 1 ] ];
            }
            return pts;
        },
    },
    XYZ: {
        P: (F, f, hasZ) => (
            hasZ
                ? [ F[ f ], F[ f + 1 ], F[ f + 2 ] ]
                : [ F[ f ], F[ f + 1 ] ]
        ),
        C: (F, l, f, hasZ, hasM) => {
            const stride = 3 + hasM;
            const pts = Array<Position>(l);
            for (let i = 0; i < l; i++, f += stride) {
                pts[ i ] = hasZ
                    ? [ F[ f ], F[ f + 1 ], F[ f + 2 ] ]
                    : [ F[ f ], F[ f + 1 ] ];
            }
            return pts;
        },
    },
    XYZM: {
        P: (F, f, hasZ, hasM) => (
            hasM
                ? [ F[ f ], F[ f + 1 ], F[ f + 2 ], F[ f + 3 ] ]
                : hasZ
                    ? [ F[ f ], F[ f + 1 ], F[ f + 2 ] ]
                    : [ F[ f ], F[ f + 1 ] ]
        ),
        C: (F, l, f, hasZ, hasM) => {
            const stride = 3 + hasM;
            const pts = Array<Position>(l);
            for (let i = 0; i < l; i++, f += stride) {
                pts[ i ] = hasM
                    ? [ F[ f ], F[ f + 1 ], F[ f + 2 ], F[ f + 3 ] ]
                    : hasZ
                        ? [ F[ f ], F[ f + 1 ], F[ f + 2 ] ]
                        : [ F[ f ], F[ f + 1 ] ];
            }
            return pts;
        },
    },
    XYM: {
        P: (F, f, _hasZ, hasM) => (
            hasM
                ? [ F[ f ], F[ f + 1 ], F[ f + 3 ] ]
                : [ F[ f ], F[ f + 1 ] ]
        ),
        C: (F, l, f, _hasZ, hasM) => {
            const stride = 3 + hasM;
            const pts = Array<Position>(l);
            for (let i = 0; i < l; i++, f += stride) {
                pts[ i ] = hasM
                    ? [ F[ f ], F[ f + 1 ], F[ f + 3 ] ]
                    : [ F[ f ], F[ f + 1 ] ];
            }
            return pts;
        },
    },
};


interface JsonifyState {
    B: Uint32Array;
    b: number; // buffer index
    F: Float64Array;
    f: number; // to read (Multi)Point coordinates
}

const jsonifyGeom = (s: JsonifyState, o: OutputCoordsOptions, extended: boolean | undefined): JSON_Geometry => {
    const { B, F } = s;
    const header = B[ s.b++ ];
    const typeId = header & 15;
    const isEmpty = header & 16;
    const hasZ = (header >> 5 & 1) as 0 | 1;
    const hasM = (header >> 6 & 1) as 0 | 1;

    if (extended || typeId < 8) {
        if (isEmpty && typeId < 9 && typeId !== 7) {
            return { // LinearRing(2) is treated as LineString(1)
                type: GEOSGeometryTypeDecoder[ typeId === 2 ? 1 : typeId as 0 | 1 | 3 | 4 | 5 | 6 | 8 ],
                coordinates: [],
            };
        }

        switch (typeId) {

            case 0: { // Point
                const pt = o.P(F, s.f, hasZ, hasM);
                s.f += hasM ? 4 : hasZ ? 3 : 2;
                return { type: GEOSGeometryTypeDecoder[ typeId ], coordinates: pt };
            }

            case 4: { // MultiPoint
                const ptsLength = B[ s.b++ ];
                const pts = Array<Position>(ptsLength);
                const step = hasM ? 4 : hasZ ? 3 : 2;
                for (let i = 0; i < ptsLength; i++, s.f += step) {
                    pts[ i ] = o.P(F, s.f, hasZ, hasM);
                }
                return { type: GEOSGeometryTypeDecoder[ typeId ], coordinates: pts };
            }

            case 1: // LineString
            case 2: // LinearRing
            case 8: { // CircularString
                const pts = o.C(F, B[ s.b++ ], B[ s.b++ ], hasZ, hasM);
                return { type: GEOSGeometryTypeDecoder[ typeId === 2 ? 1 : typeId ], coordinates: pts };
            }

            case 3: // Polygon
            case 5: { // MultiLineString
                const pptsLength = B[ s.b++ ];
                const ppts = Array<Position[]>(pptsLength);
                for (let j = 0; j < pptsLength; j++) {
                    ppts[ j ] = o.C(F, B[ s.b++ ], B[ s.b++ ], hasZ, hasM);
                }
                return { type: GEOSGeometryTypeDecoder[ typeId ], coordinates: ppts };
            }

            case 6: { // MultiPolygon
                const ppptsLength = B[ s.b++ ];
                const pppts = Array<Position[][]>(ppptsLength);
                for (let k = 0; k < ppptsLength; k++) {
                    const pptsLength = B[ s.b++ ];
                    const ppts = pppts[ k ] = Array<Position[]>(pptsLength);
                    for (let j = 0; j < pptsLength; j++) {
                        ppts[ j ] = o.C(F, B[ s.b++ ], B[ s.b++ ], hasZ, hasM);
                    }
                }
                return { type: GEOSGeometryTypeDecoder[ typeId ], coordinates: pppts };
            }

            case 7: // GeometryCollection
            case 9: // CompoundCurve
            case 10: // CurvePolygon
            case 11: // MultiCurve
            case 12: { // MultiSurface
                const geomsLength = isEmpty ? 0 : B[ s.b++ ];
                const geoms = Array<JSON_Geometry>(geomsLength);
                for (let i = 0; i < geomsLength; i++) {
                    geoms[ i ] = jsonifyGeom(s, o, extended);
                }
                const type = GEOSGeometryTypeDecoder[ typeId ], key = CollectionElementsKeyMap[ type ];
                return { type, [ key ]: geoms } as unknown as JSON_Geometry;
            }

        }
    }

    throw new GEOSError(`${GEOSGeometryTypeDecoder[ typeId ]} is not standard GeoJSON geometry. Use 'extended' flavor to jsonify all geometry types.`);
};


/**
 * Converts a geometry object to its GeoJSON representation.
 *
 * @param geometry - The geometry object to be converted
 * @param layout - Output geometry coordinate layout
 * @param extended - Whether to allow all geometry types to be converted
 * @returns A GeoJSON representation of the geometry
 * @throws {GEOSError} when called with an unsupported geometry type (not GeoJSON)
 *
 * @example
 * const a = point([ 0, 0 ]);
 * const b = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
 * const c = polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
 * const a_json = jsonifyGeometry(a); // { type: 'Point', coordinates: [ 0, 0 ] };
 * const b_json = jsonifyGeometry(b); // { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] };
 * const c_json = jsonifyGeometry(c); // { type: 'Polygon', coordinates: [ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ] };
 */
export function jsonifyGeometry<T extends JSON_Geometry>(geometry: GeometryRef, layout?: CoordinateType, extended?: boolean): T {
    const o = CoordsOptionsMap[ layout || 'XYZ' ];
    const buff = geos.buff;
    let tmpOutBuffPtr: 0 | Ptr<u32>;
    try {
        let B = geos.U32;
        let b = buff.i4, b0 = b;
        B[ b++ ] = 0;
        B[ b++ ] = 1;
        B[ b++ ] = geometry[ POINTER ];
        B[ b ] = buff.l4 - 3; // buffAvailableL4

        geos.jsonify_geoms(buff[ POINTER ]);

        B = geos.U32;
        const s: JsonifyState = { B, b, F: geos.F64, f: B[ b0 + 1 ] }; // f = buff[1]

        tmpOutBuffPtr = B[ b0 ] as typeof tmpOutBuffPtr; // buff[0]
        if (tmpOutBuffPtr) {
            s.b = tmpOutBuffPtr / 4;
        }

        return jsonifyGeom(s, o, extended) as T;
    } finally {
        if (tmpOutBuffPtr!) {
            geos.free(tmpOutBuffPtr);
        }
    }
}


/**
 * Converts an array of geometries to an array of GeoJSON `Feature` objects.
 *
 * @param geometries - Array of geometries to be converted
 * @param layout - Output geometry coordinate layout
 * @param extended - Whether to allow all geometry types to be converted
 * @returns Array of GeoJSON `Feature` objects
 * @throws {GEOSError} when called with an unsupported geometry type (not GeoJSON)
 *
 * @example
 * const a = point([ 0, 0 ], { id: 1, properties: { name: 'A' } });
 * const b = lineString([ [ 0, 0 ], [ 1, 1 ] ], { id: 2 });
 * const c = polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
 * const features = jsonifyFeatures([ a, b, c ]);
 * // [
 * //     {
 * //         id: 1,
 * //         type: 'Feature',
 * //         geometry: { type: 'Point', coordinates: [ 0, 0 ] },
 * //         properties: { name: 'A' },
 * //     },
 * //     {
 * //         id: 2,
 * //         type: 'Feature',
 * //         geometry: { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 * //         properties: null,
 * //     },
 * //     {
 * //         type: 'Feature',
 * //         geometry: { type: 'Polygon', coordinates: [ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ] },
 * //         properties: null,
 * //     },
 * // ];
 */
export function jsonifyFeatures<P>(geometries: Geometry<P>[], layout?: CoordinateType, extended?: boolean): JSON_Feature<JSON_Geometry, P>[] {
    const o = CoordsOptionsMap[ layout || 'XYZ' ];
    const geometriesLength = geometries.length;
    const buffNeededL4 = geometriesLength + 3;
    const buff = geos.buffByL4(buffNeededL4);
    let tmpOutBuffPtr: 0 | Ptr<u32>;
    try {
        let B = geos.U32;
        let b = buff.i4, b0 = b;
        B[ b++ ] = 0;
        B[ b++ ] = geometriesLength;
        for (const geometry of geometries) {
            B[ b++ ] = geometry[ POINTER ];
        }
        B[ b ] = buff.l4 - buffNeededL4; // buffAvailableL4

        geos.jsonify_geoms(buff[ POINTER ]);

        B = geos.U32;
        const s: JsonifyState = { B, b, F: geos.F64, f: B[ b0 + 1 ] }; // f = buff[1]

        tmpOutBuffPtr = B[ b0 ] as typeof tmpOutBuffPtr; // buff[0]
        if (tmpOutBuffPtr) {
            s.b = tmpOutBuffPtr / 4;
        }

        const features = Array<JSON_Feature<JSON_Geometry, P>>(geometriesLength);
        for (let i = 0; i < geometriesLength; i++) {
            const geometry = geometries[ i ];
            features[ i ] = feature(geometry, jsonifyGeom(s, o, extended));
        }
        return features;
    } finally {
        buff.freeIfTmp();
        if (tmpOutBuffPtr!) {
            geos.free(tmpOutBuffPtr);
        }
    }
}


export function feature<P>(f: GeometryRef<P>, g: JSON_Geometry): JSON_Feature<JSON_Geometry, P> {
    return { id: f.id, type: 'Feature', geometry: g, properties: (f.props ?? null) as P };
}
