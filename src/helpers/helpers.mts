import type { Position } from 'geojson';
import type { Point } from '../geom/types/Point.mjs';
import type { GeometryCollection } from '../geom/types/GeometryCollection.mjs';
import type { MultiPolygon } from '../geom/types/MultiPolygon.mjs';
import type { MultiLineString } from '../geom/types/MultiLineString.mjs';
import type { MultiPoint } from '../geom/types/MultiPoint.mjs';
import type { Polygon } from '../geom/types/Polygon.mjs';
import type { LineString } from '../geom/types/LineString.mjs';
import type { MultiCurve } from '../geom/types/MultiCurve.mjs';
import type { CircularString } from '../geom/types/CircularString.mjs';
import type { CompoundCurve } from '../geom/types/CompoundCurve.mjs';
import type { MultiSurface } from '../geom/types/MultiSurface.mjs';
import type { CurvePolygon } from '../geom/types/CurvePolygon.mjs';
import type { ReusableBuffer } from '../core/reusable-memory.mjs';
import type { GEOSGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import type { GeoJSONInputOptions } from '../io/GeoJSON.mjs';
import { FINALIZATION, POINTER } from '../core/symbols.mjs';
import { type Geometry, type GeometryExtras, GeometryRef, GEOSGeometryTypeDecoder, GEOSGeomTypeIdMap } from '../geom/Geometry.mjs';
import { geosifyGeometry } from '../io/geosify.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


export interface JSONInputOptions<P> extends GeometryExtras<P>, GeoJSONInputOptions {
}

export interface GEOSInputOptions<P> extends GeometryExtras<P> {

    /**
     * Whether to consume the input geometries - consumed geometries become
     * [detached]{@link GeometryRef#detached}, are no longer valid and should
     * **not** be used.
     *
     * When `true` the ownership of input geometries is passed to created
     * collection geometry, no extra copies are made, but the input geometries
     * can no longer be used on their own.
     *
     * When `false` the [clones]{@link GeometryRef#clone} of input geometries
     * are used to create a collection geometry.
     *
     * @default false
     */
    consume?: boolean;

}


/**
 * Creates a {@link Point} geometry from a position.
 *
 * @param pt - Point coordinates
 * @param options - Optional geometry options
 * @returns A new Point geometry
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const b = point([ 2, 0 ], { properties: { name: 'B' } });
 */
export function point<P>(pt: Position, options?: JSONInputOptions<P>): Point<P> {
    return geosifyGeometry({ type: 'Point', coordinates: pt }, options?.layout, options) as Point<P>;
}


/**
 * Creates a {@link LineString} geometry from an array of positions.
 *
 * Line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param pts - LineString coordinates
 * @param options - Optional geometry options
 * @returns A new LineString geometry
 * @throws {InvalidGeoJSONError} on line with 1 position
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 2, 1 ], [ 0, 2 ] ]);
 * const b = lineString([ [ 2, 0 ], [ 4, 0 ] ], { properties: { name: 'B' } });
 */
export function lineString<P>(pts: Position[], options?: JSONInputOptions<P>): LineString<P> {
    return geosifyGeometry({ type: 'LineString', coordinates: pts }, options?.layout, options) as LineString<P>;
}


/**
 * Creates a {@link Polygon} geometry from an array of linear rings coordinates.
 *
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param ppts - Polygon coordinates
 * @param options - Optional geometry options
 * @returns A new Polygon geometry
 * @throws {InvalidGeoJSONError} if any ring is invalid (not closed or with 1 or 2 positions)
 *
 * @example #live
 * const a = polygon([ [ [ 4, 3 ], [ 5, 4 ], [ 5, 3 ], [ 4, 3 ] ] ]);
 * const b = polygon([
 *     [ [ 0, 0 ], [ 0, 8 ], [ 8, 8 ], [ 8, 0 ], [ 0, 0 ] ],
 *     [ [ 2, 2 ], [ 6, 2 ], [ 6, 6 ], [ 2, 2 ] ],
 * ], { properties: { name: 'B' } });
 */
export function polygon<P>(ppts: Position[][], options?: JSONInputOptions<P>): Polygon<P> {
    return geosifyGeometry({ type: 'Polygon', coordinates: ppts }, options?.layout, options) as Polygon<P>;
}


/**
 * Creates a {@link MultiPoint} geometry from an array of positions or an array
 * of [Points]{@link Point}.
 *
 * @param data - MultiPoint coordinates or an array of Points
 * @param options - Optional geometry options
 * @returns A new MultiPoint geometry
 * @throws {GEOSError} when any of the input geometries is not a {@link Point}
 *
 * @example #live
 * // from coordinates
 * const a = multiPoint([ [ 0, 0 ], [ 2, 0 ], [ 4, 0 ] ]);
 * const b = multiPoint([ [ 1, 0 ], [ 3, 0 ] ], { properties: { name: 'B' } });
 *
 * // from point geometries
 * const parts = [
 *     point([ 1, 1 ]),
 *     point([ 2, 1 ]),
 *     point([ 3, 1 ]),
 * ];
 * const c = multiPoint(parts, { id: 'C' });
 * const consumableParts = [
 *     point([ 1, 2 ]),
 *     point([ 3, 2 ]),
 * ];
 * const d = multiPoint(consumableParts, { consume: true });
 * // all `consumableParts` are detached
 */
export function multiPoint<P>(pts: Position[], options?: JSONInputOptions<P>): MultiPoint<P>;
export function multiPoint<P>(points: Point[], options?: GEOSInputOptions<P>): MultiPoint<P>;
export function multiPoint<P>(data: Position[] | Point[], options?: JSONInputOptions<P> | GEOSInputOptions<P>): MultiPoint<P> {
    if (areCoords(data)) {
        return geosifyGeometry(
            { type: 'MultiPoint', coordinates: data },
            (options as JSONInputOptions<P>)?.layout,
            options,
        ) as MultiPoint<P>;
    }
    checkTypes(data, 1); // `(1 << 0) = 1` accept Point(0)
    return collection(4, data, options);
}


/**
 * Creates a {@link MultiLineString} geometry from an array of line strings coordinates
 * or an array of [LineStrings]{@link LineString}.
 *
 * Each line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param data - MultiLineString coordinates or an array of LineStrings
 * @param options - Optional geometry options
 * @returns A new MultiLineString geometry
 * @throws {InvalidGeoJSONError} on line with 1 position
 * @throws {GEOSError} when any of the input geometries is not a {@link LineString}
 *
 * @example #live
 * // from coordinates
 * const a = multiLineString([
 *     [ [ -10, 3 ], [ 5, 4 ] ],
 *     [ [ -10, 7 ], [ 5, 6 ] ],
 * ]);
 * const b = multiLineString([
 *     [ [ 0, 0 ], [ 10, 5 ], [ 0, 10 ] ],
 *     [ [ 1, 0 ], [ 12, 5 ], [ 1, 10 ] ],
 * ], { properties: { name: 'B' } });
 *
 * // from line string geometries
 * const parts = [
 *     lineString([ [ -14, 10 ], [ -14, -4 ], [ 16, -4 ] ]),
 *     lineString([ [ 16, 0 ], [ 16, 14 ], [ -14, 14 ] ]),
 * ];
 * const c = multiLineString(parts, { id: 'C' });
 * const consumableParts = [
 *     lineString([ [ -15, 11 ], [ -15, -5 ], [ 17, -5 ] ]),
 *     lineString([ [ 17, -1 ], [ 17, 15 ], [ -15, 15 ] ]),
 * ];
 * const d = multiLineString(consumableParts, { consume: true });
 * // all `consumableParts` are detached
 */
export function multiLineString<P>(ppts: Position[][], options?: JSONInputOptions<P>): MultiLineString<P>;
export function multiLineString<P>(lines: LineString[], options?: GEOSInputOptions<P>): MultiLineString<P>;
export function multiLineString<P>(data: Position[][] | LineString[], options?: JSONInputOptions<P> | GEOSInputOptions<P>): MultiLineString<P> {
    if (areCoords(data)) {
        return geosifyGeometry(
            { type: 'MultiLineString', coordinates: data },
            (options as JSONInputOptions<P>)?.layout,
            options,
        ) as MultiLineString<P>;
    }
    checkTypes(data, 2); // `(1 << 1) = 2` accept LineString(1)
    return collection(5, data, options);
}


/**
 * Creates a {@link MultiPolygon} geometry from an array of polygon coordinates
 * or an array of [Polygons]{@link Polygon}.
 *
 * Each polygon must consist of an array of linear rings coordinates.
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param data - MultiPolygon coordinates or an array of Polygons
 * @param options - Optional geometry options
 * @returns A new MultiPolygon geometry
 * @throws {InvalidGeoJSONError} if any ring is invalid (not closed or with 1 or 2 positions)
 * @throws {GEOSError} when any of the input geometries is not a {@link Polygon}
 *
 * @example #live
 * // from coordinates
 * const a = multiPolygon([
 *     [ [ [ 1, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ] ] ],
 *     [ [ [ 1, 1 ], [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ] ],
 * ]);
 * const b = multiPolygon([
 *     [ [ [ 0, 1 ], [ 1, 2 ], [ 1, 1 ], [ 0, 1 ] ] ],
 *     [ [ [ 1, 0 ], [ 1, 1 ], [ 2, 1 ], [ 1, 0 ] ] ],
 * ], { properties: { name: 'B' } });
 *
 * // from polygon geometries
 * const parts = [
 *     polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]),
 *     polygon([ [ [ 1, 2 ], [ 2, 2 ], [ 2, 1 ], [ 1, 2 ] ] ]),
 * ];
 * const c = multiPolygon(parts, { id: 'C' });
 * const consumableParts = [
 *     polygon([ [ [ 0, 1 ], [ 0, 2 ], [ 1, 2 ], [ 0, 1 ] ] ]),
 *     polygon([ [ [ 1, 0 ], [ 2, 1 ], [ 2, 0 ], [ 1, 0 ] ] ]),
 * ];
 * const d = multiPolygon(consumableParts, { consume: true });
 * // all `consumableParts` are detached
 */
export function multiPolygon<P>(pppts: Position[][][], options?: JSONInputOptions<P>): MultiPolygon<P>;
export function multiPolygon<P>(polygons: Polygon[], options?: GEOSInputOptions<P>): MultiPolygon<P>;
export function multiPolygon<P>(data: Position[][][] | Polygon[], options?: JSONInputOptions<P> | GEOSInputOptions<P>): MultiPolygon<P> {
    if (areCoords(data)) {
        return geosifyGeometry(
            { type: 'MultiPolygon', coordinates: data },
            (options as JSONInputOptions<P>)?.layout,
            options,
        ) as MultiPolygon<P>;
    }
    checkTypes(data, 8); // `(1 << 3) = 8` accept Polygon(3)
    return collection(6, data, options);
}


/**
 * Creates a {@link GeometryCollection} geometry from an array of [Geometries]{@link Geometry}.
 *
 * @param geometries - Array of geometry objects to be included in the collection
 * @param options - Optional geometry options
 * @returns A new GeometryCollection geometry containing all input geometries
 *
 * @example #live
 * const parts = [
 *     polygon([ [ [ 4, 1 ], [ 4, 3 ], [ 8, 2 ], [ 4, 1 ] ] ]),
 *     lineString([ [ 0, 2 ], [ 5, 2 ] ]),
 * ];
 * const a = geometryCollection(parts);
 * const consumableParts = [
 *     lineString([ [ 6, 3 ], [ 9, 2 ], [ 6, 1 ] ]),
 *     point([ 10, 2 ]),
 * ];
 * const b = geometryCollection(consumableParts, { consume: true });
 * // all `consumableParts` are detached
 */
export function geometryCollection<P>(geometries: Geometry[], options?: GEOSInputOptions<P>): GeometryCollection<P> {
    return collection(7, geometries, options);
}


/**
 * Creates a {@link CircularString} geometry from an array of points.
 *
 * Circular string is a sequence of connected circular arcs, where circular arc
 * is defined by 3 points:
 * - start point,
 * - some point on the arc,
 * - end point.
 *
 * Circular string must have at least 3 points (one circular arc), each
 * consecutive arc adds 2 points (arc start points is the end point from the
 * previous arc), so the total number of points must be odd.
 * Empty circular strings with 0 points are allowed.
 *
 * @param pts - CircularString coordinates
 * @param options - Optional geometry options
 * @returns A new CircularString geometry
 * @throws {InvalidGeoJSONError} if total number of points is even or equal to 1
 *
 * @example #live
 * const a = circularString([ [ 0, 0 ], [ 2, 8 ], [ 8, 0 ] ]);
 * // the same arc but defined by different middle point:
 * const b = circularString([ [ 0, 0 ], [ 6, 8 ], [ 8, 0 ] ]);
 *
 * // the first point of each arc (except the 1st) is the last point from prev arc
 * const c = circularString([
 * [ 12, 4 ], [ 14, 8 ], [ 16, 4 ], // arc 1: from [ 12, 4 ] via [ 14, 8 ] to [ 16, 4 ]
 *            [ 18, 0 ], [ 20, 4 ], // arc 2: from [ 16, 4 ] via [ 18, 0 ] to [ 20, 4 ]
 *            [ 22, 8 ], [ 24, 4 ], // arc 3: from [ 20, 4 ] via [ 22, 8 ] to [ 24, 4 ]
 *            [ 26, 0 ], [ 28, 4 ], // arc 4: from [ 24, 4 ] via [ 26, 0 ] to [ 28, 4 ]
 * ]);
 */
export function circularString<P>(pts: Position[], options?: JSONInputOptions<P>): CircularString<P> {
    return geosifyGeometry({ type: 'CircularString', coordinates: pts }, options?.layout, options) as CircularString<P>;
}


/**
 * Creates a {@link CompoundCurve} geometry from an array of continuous segments.
 *
 * Each segment can be either {@link LineString} or {@link CircularString},
 * they need to be connected - the first point of a segment is the same as the
 * last point from the previous segment.
 * Empty compound curves without any segments are allowed.
 *
 * @param geometries - Array of compound curve segments
 * @param options - Optional geometry options
 * @returns A new CompoundCurve geometry
 * @throws {GEOSError} when any of the input geometries is not a {@link LineString},
 * or {@link CircularString}
 * @throws {GEOSError} when input segments are not continuous
 * @throws {GEOSError} when input segments includes empty geometry
 *
 * @example #live
 * const a = compoundCurve([
 *     lineString([ [ 0, 10 ], [ 0, 0 ], [ 5, 0 ], [5, 5] ]),
 *     circularString([ [ 5, 5], [ 10, 10 ], [ 10, 0 ] ]),
 * ]);
 */
export function compoundCurve<P>(geometries: (LineString | CircularString)[], options?: GEOSInputOptions<P>): CompoundCurve<P> {
    checkTypes(geometries, 258); // `(1 << 1) | (1 << 8) = 258` accept LineString(1) or CircularString(8)
    const geometriesLength = geometries.length;
    const buff = geos.buffByL4(geometriesLength);
    try {
        prepareGeometryArray(buff, geometries, options);
        const geomPtr = geometriesLength
            ? geos.GEOSGeom_createCompoundCurve(buff[ POINTER ], geometriesLength)
            : geos.GEOSGeom_createEmptyCompoundCurve();
        return new GeometryRef(geomPtr, 'CompoundCurve', options) as CompoundCurve<P>;
    } finally {
        buff.freeIfTmp();
    }
}


/**
 * Creates a {@link CurvePolygon} geometry from an array of rings.
 *
 * Each ring can be either {@link LineString}, {@link CircularString}
 * or {@link CompoundCurve}, they need to be closed - the first and the last
 * points are the same.
 *
 * Empty curve polygons without any rings are allowed.
 *
 * @param geometries - Array of curve polygon rings
 * @param options - Optional geometry options
 * @returns A new CurvePolygon geometry
 * @throws {GEOSError} when any of the input geometries is not a {@link LineString},
 * {@link CircularString} or {@link CompoundCurve}
 *
 * @example #live
 * const a = curvePolygon([
 *     // shell (face)
 *     circularString([ [ 1, 5 ], [ 5, 9 ], [ 9, 5 ], [ 5, 1 ], [ 1, 5 ] ]),
 *     // hole 1 (mouth)
 *     compoundCurve([
 *         circularString([ [ 3, 5 ], [ 5, 2 ], [ 7, 5 ] ]),
 *         lineString([ [ 7, 5 ], [ 3, 5 ] ]),
 *     ]),
 *     // hole 2 (round eye)
 *     circularString([ [ 3, 7 ], [ 3, 6 ], [ 4, 6 ], [ 4, 7 ], [ 3, 7 ] ]),
 *     // hole 3 (square eye)
 *     lineString([ [ 6, 7 ], [ 6, 6 ], [ 7, 6 ], [ 7, 7 ], [ 6, 7 ] ]),
 * ]);
 */
export function curvePolygon<P>(geometries: (LineString | CircularString | CompoundCurve)[], options?: GEOSInputOptions<P>): CurvePolygon<P> {
    checkTypes(geometries, 770); // `(1 << 1) | (1 << 8) | (1 << 9) = 770` accept LineString(1) or CircularString(8) or CompoundCurve(9)
    const geometriesLength = geometries.length;
    const buff = geos.buffByL4(geometriesLength);
    try {
        prepareGeometryArray(buff, geometries, options);
        const geomPtr = geometriesLength
            ? geos.GEOSGeom_createCurvePolygon(geos.U32[ buff.i4 ] as Ptr<GEOSGeometry>, buff[ POINTER ] + 4 as Ptr<GEOSGeometry[]>, geometriesLength - 1)
            : geos.GEOSGeom_createEmptyCurvePolygon();
        return new GeometryRef(geomPtr, 'CurvePolygon', options) as CurvePolygon<P>;
    } finally {
        buff.freeIfTmp();
    }
}


/**
 * Creates a {@link MultiCurve} geometry from an array of curves.
 *
 * Each curve can be either {@link LineString}, {@link CircularString}
 * or {@link CompoundCurve}.
 *
 * @param geometries - Array of curve geometry objects to be included in the collection
 * @param options - Optional geometry options
 * @returns A new MultiCurve geometry
 * @throws {GEOSError} when any of the input geometries is not a {@link LineString},
 * {@link CircularString} or {@link CompoundCurve}
 *
 * @example #live
 * const parts = [
 *     // G
 *     compoundCurve([
 *         circularString([ [ 20, 20 ], [ 10, 15 ], [ 20, 10 ] ]),
 *         lineString([ [ 20, 10 ], [ 20, 14 ], [ 16, 14 ] ]),
 *     ]),
 *     // E
 *     lineString([ [ 33, 20 ], [ 23, 20 ], [ 23, 10 ], [ 33, 10 ] ]),
 *     lineString([ [ 23, 15 ], [ 28, 15 ] ]),
 * ]
 * const a = multiCurve(parts);
 * const consumableParts = [
 *     // O
 *     circularString([ [ 40, 20 ], [ 35, 15 ], [ 40, 10 ], [ 45, 15 ], [ 40, 20 ] ]),
 *     // S
 *     circularString([ [ 53, 20 ], [ 51, 21 ], [ 51, 17 ], [ 51, 9 ], [ 47, 11 ] ]),
 * ]
 * const b = multiCurve(consumableParts, { consume: true });
 * // all `consumableParts` are detached
 */
export function multiCurve<P>(geometries: (LineString | CircularString | CompoundCurve)[], options?: GEOSInputOptions<P>): MultiCurve<P> {
    checkTypes(geometries, 770); // `(1 << 1) | (1 << 8) | (1 << 9) = 770` accept LineString(1) or CircularString(8) or CompoundCurve(9)
    return collection(11, geometries, options);
}


/**
 * Creates a {@link MultiSurface} geometry from an array of surfaces.
 *
 * Each surface can be either {@link Polygon}, or {@link CurvePolygon}.
 *
 * @param geometries - Array of surface geometry objects to be included in the collection
 * @param options - Optional geometry options
 * @returns A new MultiSurface geometry
 * @throws {GEOSError} when any of the input geometries is not a {@link Polygon}
 * or {@link CurvePolygon}
 *
 * @example #live
 * const kier = curvePolygon([
 *     circularString([
 *         [ 10, 0 ], [ 5, 13 ], [ 2, 17 ], [ 5, 25 ], [ 10, 21 ],
 *         [ 15, 25 ], [ 18, 17 ], [ 15, 13 ], [ 10, 0 ],
 *     ]),
 * ]);
 * const trefl = curvePolygon([
 *     circularString([
 *         [ 24, 0 ], [ 27, 4 ], [ 29, 13 ], [ 21, 13 ], [ 27, 18 ],
 *         [ 30, 25 ], [ 33, 18 ], [ 39, 13 ], [ 31, 13 ], [ 33, 4 ],
 *         [ 36, 0 ], [ 30, 1 ], [ 24, 0 ],
 *     ]),
 * ]);
 * const karo = curvePolygon([
 *     circularString([
 *         [ 43, 13 ], [ 47, 19 ], [ 50, 25 ], [ 53, 19 ], [ 57, 13 ],
 *         [ 53, 7 ], [ 50, 1 ], [ 47, 7 ], [ 43, 13 ],
 *     ]),
 * ]);
 * const suits = multiSurface([ kier, trefl, karo ]);
 */
export function multiSurface<P>(geometries: (Polygon | CurvePolygon)[], options?: GEOSInputOptions<P>): MultiSurface<P> {
    checkTypes(geometries, 1032); // `(1 << 3) | (1 << 10) = 1032` accept Polygon(3) or CurvePolygon(10)
    return collection(12, geometries, options);
}


/**
 * Creates a rectangular {@link Polygon} geometry from bounding box coordinates.
 *
 * Polygon is oriented clockwise.
 *
 * @param bbox - Array of four numbers `[ xMin, yMin, xMax, yMax ]`
 * @param options - Optional geometry options
 * @returns A new Polygon geometry
 * @throws {GEOSError} when box is degenerated: width or height is `0`
 *
 * @see {@link bounds} calculates bounding box of an existing geometry
 *
 * @example #live
 * const a = box([ 0, 0, 4, 4 ]); // <POLYGON ((0 0, 0 4, 4 4, 4 0, 0 0))>
 * const b = box([ 5, 0, 8, 1 ]); // <POLYGON ((5 0, 5 1, 8 1, 8 0, 5 0))>
 */
export function box<P>(bbox: number[], options?: GeometryExtras<P>): Polygon<P> {
    const [ xMin, yMin, xMax, yMax ] = bbox;
    if (xMin === xMax || yMin === yMax) {
        throw new GEOSError('Degenerate box'); // point or line
    }
    return polygon([ [ [ xMin, yMin ], [ xMin, yMax ], [ xMax, yMax ], [ xMax, yMin ], [ xMin, yMin ] ] ], options);
}


const areCoords = <T extends Position[] | Position[][] | Position[][][]>(data: T | Geometry[]): data is T => {
    return (data.length && Array.isArray(data[ 0 ])) as boolean;
};

/**
 * Simple mask to check if provided geometries are of expected type
 * geometry type id is encoded as (1 << typeId)
 * mask is created as bitwise OR of encoded allowed type ids
 */
const checkTypes = (geometries: Geometry[], mask: number): void => {
    for (const geometry of geometries) {
        if (!(mask & (1 << GEOSGeomTypeIdMap[ geometry.type ]))) {
            const allowed: string[] = [];
            for (let id = 0, v = mask; v; id++, v >>>= 1) {
                if (v & 1) allowed.push(GEOSGeometryTypeDecoder[ id ]);
            }
            throw new GEOSError(`Geometry must be ${allowed.join(', ').replace(/,( \w+)$/, ' or$1')}. ${geometry.type} is not allowed`);
        }
    }
};

const prepareGeometryArray = <P, >(buff: ReusableBuffer, geometries: Geometry[], options: GEOSInputOptions<P> | undefined) => {
    let B = geos.U32, b = buff.i4;
    if (options?.consume) {
        for (const geometry of geometries) {
            B[ b++ ] = geometry[ POINTER ];
            GeometryRef[ FINALIZATION ].unregister(geometry);
            geometry.detached = true;
        }
    } else {
        for (const geometry of geometries) {
            B[ b++ ] = geos.GEOSGeom_clone(geometry[ POINTER ]);
        }
    }
};

const collection = <T extends Geometry<P>, P>(typeId: 4 | 5 | 6 | 7 | 11 | 12, geometries: Geometry[], options: GEOSInputOptions<P> | undefined): T => {
    const geometriesLength = geometries.length;
    const buff = geos.buffByL4(geometriesLength);
    try {
        prepareGeometryArray(buff, geometries, options);
        const geomPtr = geos.GEOSGeom_createCollection(typeId, buff[ POINTER ], geometriesLength);
        return new GeometryRef(geomPtr, GEOSGeometryTypeDecoder[ typeId ], options) as T;
    } finally {
        buff.freeIfTmp();
    }
};
