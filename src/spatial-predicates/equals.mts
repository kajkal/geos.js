import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` are topologically equal.
 *
 * Geometry `a` is topologically equal to geometry `b` if their interiors
 * intersect and no part of the interior or boundary of one geometry intersects
 * the exterior of the other.
 *
 * That means that the geometries must have the same dimension, and they
 * occupy the same space. They do not need to have the same vertices or even
 * the same type (MultiLine can be equal to Line, GeometryCollection to Polygon
 * etc).
 *
 * Like other spatial predicates, `equals` operates in 2D only; it ignores any
 * Z or M ordinates.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` is topologically equal to geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link equalsExact} checks whether two geometries are of the same type
 * and have the same vertices in the same order on the XY plane
 * @see {@link equalsIdentical} checks whether two geometries are of the same
 * type and have exactly the same vertices in the same order on the XYZM plane
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
 * const b = lineString([ [ 8, 0 ], [ 0, 0 ] ]);
 * const c = lineString([ [ 0, 0, 100 ], [ 8, 0, 101 ] ]);
 * const d = multiLineString([
 *     [ [ 0, 0 ], [ 5, 0 ] ],
 *     [ [ 8, 0 ], [ 3, 0 ] ],
 * ]);
 * const e = geometryCollection([
 *     lineString([ [ 0, 0 ], [ 5, 0 ] ]),
 *     lineString([ [ 5, 0 ], [ 8, 0 ] ]),
 * ]);
 * const ab_equal = equals(a, b); // true
 * const ac_equal = equals(a, c); // true (Z and M are ignored)
 * const ad_equal = equals(a, d); // true
 * const ae_equal = equals(a, e); // true
 * const emptyEmpty = equals(point([]), polygon([])); // true
 */
export function equals(a: Geometry, b: Geometry): boolean {
    return Boolean(geos.GEOSEquals(a[ POINTER ], b[ POINTER ]));
}
