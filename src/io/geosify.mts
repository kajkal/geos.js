/**
 * @file
 * # Geosify - GeoJSON* to GEOS conversion overview
 *
 * _*extended GeoJSON: with M ordinate support and curved geometries_
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
 *   a Z/M coordinate). The next numbers depend on the type of geometry. In the case
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
 * D       (u32) 6 -> geometry header - MultiPolygon XY [<type>0110 <isEmpty>0 <hasZ>0 <hasM>0]
 * D       (u32) └─ 2 -> number of sub-polygons
 * D       (u32)    ├─ 2 -> number of rings in the first sub-polygon
 * D       (u32)    │  ├─ 4 -> number of coordinates in the first sub-polygon exterior ring
 * D       (u32)    │  └─ 6 -> number of coordinates in the first sub-polygon first interior ring
 * D       (u32)    └─ 1 -> number of rings in the second sub-polygon
 * D       (u32)       └─ 5 -> number of coordinates in the second sub-polygon exterior ring
 * D       (u32) 0 -> geometry header - Point XY [<type>0000 <isEmpty>0 <hasZ>0 <hasM>0]
 * D       (u32) 33 -> geometry header - LineString XYZ [<type>0001 <isEmpty>0 <hasZ>1 <hasM>0]
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
 * From the `S` part JS-side knows the addresses of the newly created coordinate
 * sequences in Wasm memory, and can set their state without additional copies.
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

import type { LineString as GeoJSON_LineString, Position } from 'geojson';
import type { JSON_CircularString, JSON_CompoundCurve, JSON_Feature, JSON_Geometry } from '../geom/types/JSON.mjs';
import type { GEOSGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import { POINTER } from '../core/symbols.mjs';
import { CollectionElementsKeyMap, type CoordinateType, type Geometry, type GeometryExtras, GeometryRef, type GeometryType, GEOSGeometryTypeDecoder, GEOSGeomTypeIdMap } from '../geom/Geometry.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


interface InputCoordsOptions {
    /** needed places in `F` for a single point */
    L: (l: number | undefined) => number;
    /** encode geometry header */
    H: (type: GeometryType, pt: Position | undefined) => number;
    /** encode point coordinates */
    P: (pt: Position, F: Float64Array, f: number, l: number | undefined) => number;
    /** populate coordinate sequence */
    C: (pts: Position[], F: Float64Array, f: number, l: number | undefined) => void;
}

const CoordsOptionsMap: Record<CoordinateType, InputCoordsOptions> = {
    XY: {
        L: () => 2,
        H: (t) => GEOSGeomTypeIdMap[ t ],
        P: (pt, F, f) => {
            F[ f++ ] = pt[ 0 ];
            F[ f++ ] = pt[ 1 ];
            return f;
        },
        C: (pts, F, f) => {
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = NaN;
            }
        },
    },
    XYZ: {
        L: (l) => l! > 2 ? 3 : 2,
        H: (t, pt) => {
            const l = pt?.length;
            return GEOSGeomTypeIdMap[ t ] | (l! > 2 ? 32 : 0);
        },
        P: (pt, F, f, l) => {
            F[ f++ ] = pt[ 0 ];
            F[ f++ ] = pt[ 1 ];
            if (l! > 2) {
                F[ f++ ] = pt[ 2 ];
            }
            return f;
        },
        C: (pts, F, f, l) => {
            const hasZ = l! > 2;
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = hasZ ? pt[ 2 ] : NaN;
            }
        },
    },
    XYZM: {
        L: (l) => l! > 2 ? l! > 3 ? 4 : 3 : 2,
        H: (t, pt) => {
            const l = pt?.length;
            return GEOSGeomTypeIdMap[ t ] | (l! > 2 ? 32 : 0) | (l! > 3 ? 64 : 0);
        },
        P: (pt, F, f, l) => {
            F[ f++ ] = pt[ 0 ];
            F[ f++ ] = pt[ 1 ];
            if (l! > 2) {
                F[ f++ ] = pt[ 2 ];
                if (l! > 3) {
                    F[ f++ ] = pt[ 3 ];
                }
            }
            return f;
        },
        C: (pts, F, f, l) => {
            const hasZ = l! > 2;
            const hasM = l! > 3;
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = hasZ ? pt[ 2 ] : NaN;
                if (hasM) {
                    F[ f++ ] = pt[ 3 ];
                }
            }
        },
    },
    XYM: {
        L: (l) => l! > 2 ? 4 : 2,
        H: (t, pt) => {
            const l = pt?.length;
            return GEOSGeomTypeIdMap[ t ] | (l! > 2 ? 64 : 0);
        },
        P: (pt, F, f, l) => {
            F[ f++ ] = pt[ 0 ];
            F[ f++ ] = pt[ 1 ];
            if (l! > 2) {
                F[ f++ ] = NaN;
                F[ f++ ] = pt[ 2 ];
            }
            return f;
        },
        C: (pts, F, f, l) => {
            const hasM = l! > 2;
            for (const pt of pts) {
                F[ f++ ] = pt[ 0 ];
                F[ f++ ] = pt[ 1 ];
                F[ f++ ] = NaN;
                if (hasM) {
                    F[ f++ ] = pt[ 2 ];
                }
            }
        },
    },
};


/* ****************************************
 * 1) Measure and validate
 **************************************** */

export class InvalidGeoJSONError extends GEOSError {
    /** Invalid geometry */
    geometry: unknown;
    /** More detailed error reason */
    details?: string;
    /** @internal */
    constructor(geom: JSON_Geometry, message: string, details?: string) {
        super(message);
        this.name = 'InvalidGeoJSONError';
        this.details = details;
        this.geometry = geom;
    }
}

const ptsTooFewError = (geom: JSON_Geometry, limit: number, ptsLength: number, name: string): InvalidGeoJSONError => (
    new InvalidGeoJSONError(geom,
        `${name} must have at leat ${limit} points`,
        `found ${ptsLength}`,
    )
);

const ptsDifferError = (geom: JSON_Geometry, a: Position, b: Position, ringOwner?: string): InvalidGeoJSONError => (
    new InvalidGeoJSONError(geom,
        ringOwner ? `${ringOwner} ring must be closed` : `${geom.type} segments must be continuous`,
        `points [${a.join()}] and [${b.join()}] are not equal`,
    )
);

const wrongTypeError = (geom: JSON_Geometry, actual: number, allowed: number[], partName = 'component'): InvalidGeoJSONError => (
    new InvalidGeoJSONError(geom,
        `${geom.type} ${partName} must be ${allowed.map(id => GEOSGeometryTypeDecoder[ id ]).join(', ').replace(/,( \w+)$/, ' or$1')}`,
        `"${GEOSGeometryTypeDecoder[ actual ]}" is not allowed`,
    )
);


interface GeosifyCounter {
    d: number; // number of records in `D` (geometry set data)
    s: number; // number of records in `S` (`GEOSCoordSequence` that need to be created)
    f: number; // number of records in `F` (embedded coordinates of (Multi)Points)
}

const ptsDiffer = (a: Position, b: Position): boolean | undefined => {
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
        if (a[ i ] !== b[ i ]) return true;
    }
};

const validateLine = (geom: JSON_Geometry, pts: Position[]): void => {
    const ptsLength = pts.length;
    if (ptsLength === 1) {
        throw ptsTooFewError(geom, 2, ptsLength, 'LineString');
    }
};

const validatePoly = (geom: JSON_Geometry, ppts: Position[][]): void => {
    for (const pts of ppts) {
        const ptsLength = pts.length;
        if (ptsLength) { // could be empty
            if (ptsLength < 3) {
                throw ptsTooFewError(geom, 3, ptsLength, 'Polygon ring');
            }
            if (ptsDiffer(pts[ 0 ], pts[ ptsLength - 1 ])) {
                throw ptsDifferError(geom, pts[ 0 ], pts[ ptsLength - 1 ], 'Polygon');
            }
        }
    }
};

const geosifyMeasureAndValidateGeom = (geom: JSON_Geometry, c: GeosifyCounter, o: InputCoordsOptions): number => {
    switch (geom?.type) {

        case 'Point': {
            const pt = geom.coordinates;
            const dim = o.L(pt.length);
            c.f += dim;
            c.d += 1; // [header]
            return 0;
        }

        case 'MultiPoint' : {
            const pts = geom.coordinates;
            const dim = o.L(pts[ 0 ]?.length);
            c.f += pts.length * dim;
            c.d += 2; // [header][numPoints]
            return 4;
        }

        case 'LineString': {
            validateLine(geom, geom.coordinates);
            c.s += 1; // [cs->data]
            c.d += 2; // [header][cs->size/ptr]
            return 1;
        }

        case 'Polygon': {
            const ppts = geom.coordinates;
            const pptsLength = ppts.length;
            validatePoly(geom, ppts);
            c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
            c.d += 2 + pptsLength; // [header][numRings] [R1:cs->size/ptr]…[RN:cs->size/ptr]
            return 3;
        }

        case 'MultiLineString': {
            const ppts = geom.coordinates;
            const pptsLength = ppts.length;
            for (const pts of ppts) {
                validateLine(geom, pts);
            }
            c.s += pptsLength; // [L1:cs->data]…[LN:cs->data]
            c.d += 2 + pptsLength; // [header][numLines] [L1:cs->size/ptr]…[LN:cs->size/ptr]
            return 5;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            c.d += 2 + pppts.length; // [header][numPolygons] [P1:numRings]…[PN:numRings]
            for (const ppts of pppts) {
                const pptsLength = ppts.length;
                validatePoly(geom, ppts);
                c.s += pptsLength; // [R1:cs->data]…[RN:cs->data]
                c.d += pptsLength; // [R1:cs->size/ptr]…[RN:cs->size/ptr]
            }
            return 6;
        }

        case 'GeometryCollection': {
            const geoms = geom.geometries;
            for (const g of geoms) {
                geosifyMeasureAndValidateGeom(g, c, o);
            }
            c.d += 2; // [header][numGeometries]
            return 7;
        }

        case 'CircularString': {
            const ptsLength = geom.coordinates.length;
            if (ptsLength) { // could be empty
                if (ptsLength < 3) {
                    throw new InvalidGeoJSONError(geom, `${geom.type} must have at least one circular arc defined by 3 points`);
                }
                if (!(ptsLength % 2)) {
                    throw new InvalidGeoJSONError(geom, `${geom.type} must have and odd number of points`);
                }
            }
            c.s += 1; // [cs->data]
            c.d += 2; // [header][cs->size/ptr]
            return 8;
        }

        case 'CompoundCurve': {
            const segments = geom.segments;
            if (segments.length) {
                let last: Position | undefined;
                for (const segment of segments) {
                    const t = geosifyMeasureAndValidateGeom(segment, c, o);
                    if (t !== 1 && t !== 8) {
                        throw wrongTypeError(geom, t, [ 1, 8 ], 'segment');
                    }
                    const pts = segment.coordinates;
                    if (!pts.length) {
                        throw new InvalidGeoJSONError(geom, `${geom.type} cannot contain empty segments`);
                    }
                    if (last && ptsDiffer(last, pts[ 0 ])) {
                        throw ptsDifferError(geom, last, pts[ 0 ]);
                    }
                    last = pts[ pts.length - 1 ];
                }
            }
            c.d += 2; // [header][numGeometries]
            return 9;
        }

        case 'CurvePolygon': {
            const rings = geom.rings;
            if (rings.length) {
                for (const ring of rings) {
                    let pts: Position[], first: Position, last: Position;
                    const t = geosifyMeasureAndValidateGeom(ring, c, o);
                    if (t === 1 || t === 8) {
                        pts = (ring as GeoJSON_LineString | JSON_CircularString).coordinates;
                        first = pts[ 0 ];
                        last = pts[ pts.length - 1 ];
                    } else if (t === 9) {
                        const segments = (ring as JSON_CompoundCurve).segments;
                        first = segments[ 0 ].coordinates[ 0 ];
                        pts = segments[ segments.length - 1 ].coordinates;
                        last = pts[ pts.length - 1 ];
                    } else {
                        throw wrongTypeError(geom, t, [ 1, 8, 9 ], 'ring');
                    }
                    if (first && last && ptsDiffer(first, last)) { // allow for empty rings like with standard polygons
                        throw ptsDifferError(geom, first, last, geom.type);
                    }
                    // TODO each ring must have at least N points
                }
            }
            c.d += 2; // [header][numGeometries]
            return 10;
        }

        case 'MultiCurve': {
            const geoms = geom.curves;
            for (const g of geoms) {
                const t = geosifyMeasureAndValidateGeom(g, c, o);
                if (t !== 1 && t !== 8 && t !== 9) {
                    throw wrongTypeError(geom, t, [ 1, 8, 9 ]);
                }
            }
            c.d += 2; // [header][numGeometries]
            return 11;
        }

        case 'MultiSurface': {
            const geoms = geom.surfaces;
            for (const g of geoms) {
                const t = geosifyMeasureAndValidateGeom(g, c, o);
                if (t !== 3 && t !== 10) {
                    throw wrongTypeError(geom, t, [ 3, 10 ]);
                }
            }
            c.d += 2; // [header][numGeometries]
            return 12;
        }

    }
    throw new InvalidGeoJSONError(geom, 'Invalid geometry');
};


/* ****************************************
 * 2) Encode metadata
 **************************************** */

interface GeosifyEncodeState {
    B: Uint32Array;
    d: number; // `D` iterator
    F: Float64Array;
    f: number; // `F` iterator
}

const geosifyEncodeGeom = (geom: JSON_Geometry, s: GeosifyEncodeState, o: InputCoordsOptions): void => {
    const { B, F } = s;
    let { d, f } = s;

    // geom header = typeId | (+isEmpty << 4) | (+hasZ << 5) | (+hasM << 6);

    const type = geom.type;
    switch (type) {

        case 'Point': {
            const pt = geom.coordinates;
            if (pt.length) {
                B[ d++ ] = o.H(type, pt);
                f = o.P(pt, F, f, pt.length);
            } else {
                B[ d++ ] = 16; // 0 | (1 << 4) | (0 << 5) | (0 << 6)
            }
            break;
        }

        case 'MultiPoint': {
            const pts = geom.coordinates;
            const dim = pts[ 0 ]?.length;
            B[ d++ ] = o.H(type, pts[ 0 ]);
            B[ d++ ] = pts.length;
            for (const pt of pts) {
                f = o.P(pt, F, f, dim);
            }
            break;
        }

        case 'LineString':
        case 'CircularString': {
            const pts = geom.coordinates;
            B[ d++ ] = o.H(type, pts[ 0 ]);
            B[ d++ ] = pts.length;
            break;
        }

        case 'Polygon':
        case 'MultiLineString': {
            const ppts = geom.coordinates;
            B[ d++ ] = o.H(type, ppts[ 0 ]?.[ 0 ]);
            B[ d++ ] = ppts.length;
            for (const pts of ppts) {
                B[ d++ ] = pts.length;
            }
            break;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            B[ d++ ] = o.H(type, pppts[ 0 ]?.[ 0 ]?.[ 0 ]);
            B[ d++ ] = pppts.length;
            for (const ppts of pppts) {
                B[ d++ ] = ppts.length;
                for (const pts of ppts) {
                    B[ d++ ] = pts.length;
                }
            }
            break;
        }

        case 'GeometryCollection':
        case 'CompoundCurve':
        case 'CurvePolygon':
        case 'MultiCurve':
        case 'MultiSurface': {
            const geoms = (geom as any)[ CollectionElementsKeyMap[ type ] ] as JSON_Geometry[];
            B[ s.d++ ] = GEOSGeomTypeIdMap[ type ];
            B[ s.d++ ] = geoms.length;
            for (const g of geoms) {
                geosifyEncodeGeom(g, s, o);
            }
            return;
        }

    }
    s.f = f;
    s.d = d;
};


/* ****************************************
 * 4) Populate coordinate sequences
 **************************************** */

interface GeosifyPopulateState {
    B: Uint32Array;
    s: number; // `S` iterator
    F: Float64Array;
}

const geosifyPopulateGeom = (geom: JSON_Geometry, s: GeosifyPopulateState, o: InputCoordsOptions): void => {
    const { B, F } = s;
    switch (geom.type) {

        // Point & MultiPoint - skip

        case 'LineString':
        case 'CircularString': {
            const pts = geom.coordinates;
            o.C(pts, F, B[ s.s++ ], pts[ 0 ]?.length);
            break;
        }

        case 'Polygon':
        case 'MultiLineString': {
            const ppts = geom.coordinates;
            const dim = ppts[ 0 ]?.[ 0 ]?.length;
            for (const pts of ppts) {
                o.C(pts, F, B[ s.s++ ], dim);
            }
            break;
        }

        case 'MultiPolygon': {
            const pppts = geom.coordinates;
            const dim = pppts[ 0 ]?.[ 0 ]?.[ 0 ]?.length;
            for (const ppts of pppts) {
                for (const pts of ppts) {
                    o.C(pts, F, B[ s.s++ ], dim);
                }
            }
            break;
        }

        case 'GeometryCollection':
        case 'CompoundCurve':
        case 'CurvePolygon':
        case 'MultiCurve':
        case 'MultiSurface': {
            const geoms = (geom as any)[ CollectionElementsKeyMap[ geom.type ] ] as JSON_Geometry[];
            for (const g of geoms) {
                geosifyPopulateGeom(g, s, o);
            }
        }

    }
};


/**
 * Creates a {@link Geometry} from GeoJSON geometry object.
 *
 * @param geojson - GeoJSON geometry object
 * @param layout - Input geometry coordinate layout
 * @param extras - Optional geometry extras
 * @returns A new geometry
 * @throws {InvalidGeoJSONError} on invalid GeoJSON geometry
 *
 * @example
 * const pt = geosifyGeometry({
 *     type: 'Point',
 *     coordinates: [ 1, 1 ],
 * }, 'XYZM');
 * const line = geosifyGeometry({
 *     type: 'LineString',
 *     coordinates: [ [ 0, 0 ], [ 1, 1 ] ],
 * }, 'XYZM');
 * const collection = geosifyGeometry({
 *     type: 'GeometryCollection',
 *     geometries: [
 *         { type: 'Point', coordinates: [ 1, 1 ] },
 *         { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
 *     ],
 * }, 'XYZM');
 * pt.type; // 'Point'
 * line.type; // 'LineString'
 * collection.type; // 'GeometryCollection'
 */
export function geosifyGeometry<P>(geojson: JSON_Geometry, layout?: CoordinateType, extras?: GeometryExtras<P>): Geometry<P> {
    const o = CoordsOptionsMap[ layout || 'XYZM' ];
    const c: GeosifyCounter = { d: 0, s: 0, f: 0 };
    geosifyMeasureAndValidateGeom(geojson, c, o);
    const buff = geos.buffByL4(3 + c.d + c.s + c.f * 2);
    try {
        let B = geos.U32;
        let d = buff.i4, s: number, f: number;
        B[ d++ ] = c.d;
        B[ d++ ] = c.s;
        s = d + c.d;
        f = Math.ceil((s + c.s) / 2);

        const es: GeosifyEncodeState = { B, d, F: geos.F64, f };
        geosifyEncodeGeom(geojson, es, o);

        if (c.s) {
            geos.geosify_geomsCoords(buff[ POINTER ]);
            const ps: GeosifyPopulateState = { B: geos.U32, s, F: geos.F64 };
            geosifyPopulateGeom(geojson, ps, o);
        }

        geos.geosify_geoms(buff[ POINTER ]);

        B = geos.U32;
        return new GeometryRef(
            B[ d ] as Ptr<GEOSGeometry>,
            geojson.type,
            extras,
        ) as Geometry<P>;
    } finally {
        buff.freeIfTmp();
    }
}

/**
 * Creates an array of {@link GeometryRef} from an array of GeoJSON feature objects.
 *
 * @param geojsons - Array of GeoJSON feature objects
 * @param layout - Input geometry coordinate layout
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
 * ], 'XYZM');
 * pt.type; // 'Point'
 * line.type; // 'LineString'
 * collection.type; // 'GeometryCollection'
 */
export function geosifyFeatures<P>(geojsons: JSON_Feature<JSON_Geometry, P>[], layout?: CoordinateType): Geometry<P>[] {
    const o = CoordsOptionsMap[ layout || 'XYZM' ];
    const c: GeosifyCounter = { d: 0, s: 0, f: 0 };
    for (const geom of geojsons) {
        geosifyMeasureAndValidateGeom(geom.geometry, c, o);
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
            geosifyEncodeGeom(geom.geometry, es, o);
        }

        if (c.s) {
            geos.geosify_geomsCoords(buff[ POINTER ]);
            const ps: GeosifyPopulateState = { B: geos.U32, s, F: geos.F64 };
            for (const geom of geojsons) {
                geosifyPopulateGeom(geom.geometry, ps, o);
            }
        }

        geos.geosify_geoms(buff[ POINTER ]);

        B = geos.U32;
        const geometriesLength = geojsons.length;
        const geosGeometries = Array<Geometry<P>>(geometriesLength);
        for (let i = 0; i < geometriesLength; i++) {
            const feature = geojsons[ i ];
            geosGeometries[ i ] = new GeometryRef(
                B[ d++ ] as Ptr<GEOSGeometry>,
                feature.geometry.type,
                feature,
            ) as Geometry<P>;
        }
        return geosGeometries;
    } finally {
        buff.freeIfTmp();
    }
}
