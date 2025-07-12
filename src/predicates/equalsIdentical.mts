import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` are of the same type and have
 * exactly the same vertices in the same order on the XYZM plane.
 *
 * Vertices are checked by index so any additional midpoint or reversed order
 * results in the geometries not being considered equal.
 *
 * `NaN` values are considered to be equal to other `NaN` values.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometries `a` and `b` are of the same type and have
 * matching vertices
 *
 * @see {@link equals} checks if two geometries are topologically equal
 * @see {@link equalsExact} checks whether two geometries are of the same type
 * and have the same vertices in the same order on the XY plane
 * @see {@link GeometryRef#normalize} normalized geometries are easier to compare
 *
 * @example #live
 * const a = lineString([ [ 0, 0, 100 ], [ 8, 0, 101 ] ]);
 *
 * const t1 = equalsIdentical(a, lineString([ [ 0, 0, 100 ], [ 8, 0, 101 ] ]));
 *
 * // wrong type
 * const f1 = equalsIdentical(a, multiLineString([ [ [ 0, 0, 100 ], [ 8, 0, 101 ] ] ]));
 * // missing Z value
 * const f2 = equalsIdentical(a, lineString([ [ 0, 0 ], [ 8, 0 ] ]));
 * // wrong Z value
 * const f3 = equalsIdentical(a, lineString([ [ 0, 0, 100 ], [ 8, 0, 102 ] ]));
 * // extra midpoint
 * const f4 = equalsIdentical(a, lineString([ [ 0, 0 ], [ 4, 0 ], [ 8, 0 ] ]));
 * // reversed order -> wrong first point
 * const f5 = equalsIdentical(a, lineString([ [ 8, 0, 101 ], [ 0, 0, 100 ] ]));
 */
export function equalsIdentical(a: Geometry, b: Geometry): boolean {
    return Boolean(geos.GEOSEqualsIdentical(a[ POINTER ], b[ POINTER ]));
}
