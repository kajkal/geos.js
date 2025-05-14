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
 * The output buffer contains the geometry data (is empty, has z) with pointers
 * to underlying data of their coordinate sequences.
 */

import type { Geometry as GeoJSONGeometry, Position } from 'geojson';
import type { Ptr, u32 } from '../types/wasm-geos.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry, GEOSGeometryTypeDecoder } from '../geom/geometry.mjs';
import { GeosError } from '../core/geos-error.mjs';
import { geos } from '../core/geos.mjs';


interface JsonifyState {
    B: Uint32Array;
    b: number; // buffer index
    F: Float64Array;
    f: number; // to read (Multi)Point coordinates
}

const jsonifyGeom = (s: JsonifyState): GeoJSONGeometry => {
    const { B, F } = s;
    const header = B[ s.b++ ];
    const type = header & 15;
    const isEmpty = header & 16;
    const hasZ = header & 32;
    const hasM = header & 64;
    const skip = !hasZ as any + !!hasM;

    if (isEmpty) {
        if (type < 7) {
            return { type: GEOSGeometryTypeDecoder[ type as 0 | 1 | 3 | 4 | 5 | 6 ], coordinates: [] };
        }
        return { type: GEOSGeometryTypeDecoder[ type as 7 ], geometries: [] };
    }

    switch (type) {

        case 0: { // Point
            const pt: Position = hasZ
                ? [ F[ s.f++ ], F[ s.f++ ], F[ s.f++ ] ]
                : [ F[ s.f++ ], F[ s.f++ ] ];
            return { type: GEOSGeometryTypeDecoder[ type ], coordinates: pt };
        }

        case 1: { // LineString
            const ptsLength = B[ s.b++ ];
            const pts = Array<Position>(ptsLength);
            let f = B[ s.b++ ];
            for (let i = 0; i < ptsLength; i++, f += skip) {
                pts[ i ] = hasZ
                    ? [ F[ f++ ], F[ f++ ], F[ f++ ] ]
                    : [ F[ f++ ], F[ f++ ] ];
            }
            return { type: GEOSGeometryTypeDecoder[ type ], coordinates: pts };
        }

        case 4: { // MultiPoint
            const ptsLength = B[ s.b++ ];
            const pts = Array<Position>(ptsLength);
            for (let i = 0; i < ptsLength; i++) {
                pts[ i ] = hasZ
                    ? [ F[ s.f++ ], F[ s.f++ ], F[ s.f++ ] ]
                    : [ F[ s.f++ ], F[ s.f++ ] ];
            }
            return { type: GEOSGeometryTypeDecoder[ type ], coordinates: pts };
        }

        case 3: // Polygon
        case 5: { // MultiLineString
            const pptsLength = B[ s.b++ ];
            const ppts = Array<Position[]>(pptsLength);
            for (let j = 0; j < pptsLength; j++) {
                const ptsLength = B[ s.b++ ];
                const pts = ppts[ j ] = Array<Position>(ptsLength);
                let f = B[ s.b++ ];
                for (let i = 0; i < ptsLength; i++, f += skip) {
                    pts[ i ] = hasZ
                        ? [ F[ f++ ], F[ f++ ], F[ f++ ] ]
                        : [ F[ f++ ], F[ f++ ] ];
                }
            }
            return { type: GEOSGeometryTypeDecoder[ type ], coordinates: ppts };
        }

        case 6: { // MultiPolygon
            const ppptsLength = B[ s.b++ ];
            const pppts = Array<Position[][]>(ppptsLength);
            for (let k = 0; k < ppptsLength; k++) {
                const pptsLength = B[ s.b++ ];
                const ppts = pppts[ k ] = Array<Position[]>(pptsLength);
                for (let j = 0; j < pptsLength; j++) {
                    const ptsLength = B[ s.b++ ];
                    const pts = ppts[ j ] = Array<Position>(ptsLength);
                    let f = B[ s.b++ ];
                    for (let i = 0; i < ptsLength; i++, f += skip) {
                        pts[ i ] = hasZ
                            ? [ F[ f++ ], F[ f++ ], F[ f++ ] ]
                            : [ F[ f++ ], F[ f++ ] ];
                    }
                }
            }
            return { type: GEOSGeometryTypeDecoder[ type ], coordinates: pppts };
        }

        case 7: { // GeometryCollection
            const geomsLength = B[ s.b++ ];
            const geoms = Array<GeoJSONGeometry>(geomsLength);
            for (let i = 0; i < geomsLength; i++) {
                geoms[ i ] = jsonifyGeom(s);
            }
            return { type: GEOSGeometryTypeDecoder[ type ], geometries: geoms };
        }

    }

    throw new GeosError(`Unsupported geometry type ${GEOSGeometryTypeDecoder[ type ]}`);
};


/**
 * Converts a Geometry object to its GeoJSON representation.
 *
 * @param geometry - The Geometry object to be converted
 * @returns A GeoJSON representation of the geometry
 * @throws {GeosError} when called with an unsupported geometry type (not GeoJSON)
 *
 * @example
 * const pt = fromWKT('POINT (1 1)');
 * const line = fromWKT('LINESTRING (0 0, 1 1)');
 * const collection = fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))');
 * jsonifyGeometry(pt); // { type: 'Point', coordinates: [ 1, 1 ] }
 * jsonifyGeometry(line); // { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] }
 * jsonifyGeometry(collection); // { type: 'GeometryCollection', geometries: [ { type: 'Point', coordinates: [ 1, 1 ] }, { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] } ] }
 */
export function jsonifyGeometry(geometry: Geometry): GeoJSONGeometry {
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

        return jsonifyGeom(s);
    } finally {
        if (tmpOutBuffPtr) {
            geos.free(tmpOutBuffPtr);
        }
    }
}

/**
 * Converts an array of Geometry objects to its GeoJSON representation.
 *
 * @param geometries - Array of Geometry objects to be converted
 * @returns Array of GeoJSON representations of the geometries
 * @throws {GeosError} when called with an unsupported geometry type (not GeoJSON)
 *
 * @example
 * const pt = fromWKT('POINT (1 1)');
 * const line = fromWKT('LINESTRING (0 0, 1 1)');
 * const collection = fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))');
 * jsonifyGeometries([ pt, line, collection ]);
 * // [
 * //     { type: 'Point', coordinates: [ 1, 1 ] },
 * //     { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 * //     { type: 'GeometryCollection', geometries: [ { type: 'Point', coordinates: [ 1, 1 ] }, { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] } ] },
 * // ]
 */
export function jsonifyGeometries(geometries: Geometry[]): GeoJSONGeometry[] {
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

        const geoms = Array<GeoJSONGeometry>(geometriesLength);
        for (let i = 0; i < geometriesLength; i++) {
            geoms[ i ] = jsonifyGeom(s);
        }
        return geoms;
    } finally {
        buff.freeIfTmp();
        if (tmpOutBuffPtr) {
            geos.free(tmpOutBuffPtr);
        }
    }
}
