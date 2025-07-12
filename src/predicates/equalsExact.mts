import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` are of the same type and have the
 * same vertices in the same order on the XY plane.
 *
 * Vertices are checked by index so any additional midpoint or reversed order
 * results in the geometries not being considered equal.
 *
 * Vertices are compared only by their X and Y values, Z and M values are
 * ignored.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param tolerance - Tolerance to determine vertex equality
 * @returns `true` if geometries `a` and `b` are of the same type and have
 * matching vertices
 *
 * @see {@link equals} checks if two geometries are topologically equal
 * @see {@link equalsIdentical} checks whether two geometries are of the same
 * type and have exactly the same vertices in the same order on the XYZM plane
 * @see {@link GeometryRef#normalize} normalized geometries are easier to compare
 *
 * @example #live
 * const a = lineString([ [ 0, 0, 100 ], [ 8, 0, 101 ] ]);
 *
 * // only XY are compared
 * const t1 = equalsExact(a, lineString([ [ 0, 0 ], [ 8, 0 ] ]), 0);
 * // Z and M are ignored
 * const t2 = equalsExact(a, lineString([ [ 0, 0, 100 ], [ 8, 0, 102 ] ]), 0);
 * // with a tolerance
 * const t3 = equalsExact(a, lineString([ [ 0, 0 ], [ 7.9999, 0 ] ]), 0.001);
 *
 * // wrong type
 * const f1 = equalsExact(a, multiLineString([ [ [ 0, 0 ], [ 8, 0 ] ] ]), 0)
 * // extra midpoint
 * const f2 = equalsExact(a, lineString([ [ 0, 0 ], [ 4, 0 ], [ 8, 0 ] ]), 0)
 * // reversed order -> wrong first point
 * const f3 = equalsExact(a, lineString([ [ 8, 0 ], [ 0, 0 ] ]), 0);
 */
export function equalsExact(a: Geometry, b: Geometry, tolerance: number): boolean {
    return Boolean(geos.GEOSEqualsExact(a[ POINTER ], b[ POINTER ], tolerance));
}
