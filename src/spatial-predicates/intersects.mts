import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` have at least one point in common.
 *
 * Intersects implies that {@link disjoint} is `false`.\
 * Intersects is implied by {@link contains}, {@link containsProperly},
 * {@link within}, {@link covers}, {@link coveredBy}, {@link crosses},
 * {@link overlaps} and {@link touches}.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if the intersection of geometry `a` and `b` is **not** an
 * empty set
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link disjoint} returns whether geometries **not** intersect; `intersects(a, b) === !disjoint(a, b)`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = lineString([ [ 0, 2 ], [ 2, 0 ] ]);
 * const b = point([ 0, 0 ]);
 * const ab_intersect = intersects(a, b); // false
 *
 * const c = lineString([ [ 4, 2 ], [ 6, 0 ] ]);
 * const d = point([ 5, 1 ]);
 * const cd_intersect = intersects(c, d); // true
 */
export function intersects(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedIntersects(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSIntersects(a[ POINTER ], b[ POINTER ]),
    );
}


/**
 * Returns `true` if geometries `a` and `b` have no points in common.
 *
 * Disjoint implies that {@link intersects} and ({@link contains},
 * {@link containsProperly}, {@link within}, {@link covers}, {@link coveredBy},
 * {@link crosses}, {@link overlaps} and {@link touches}) are all `false`.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if the intersection of geometry `a` and `b` is an empty set
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link intersects} returns whether geometries intersect; `disjoint(a, b) === !intersects(a, b)`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = lineString([ [ 0, 2 ], [ 2, 0 ] ]);
 * const b = point([ 0, 0 ]);
 * const ab_disjoint = disjoint(a, b); // true
 *
 * const c = lineString([ [ 4, 2 ], [ 6, 0 ] ]);
 * const d = point([ 5, 1 ]);
 * const cd_disjoint = disjoint(c, d); // false
 */
export function disjoint(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedDisjoint(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSDisjoint(a[ POINTER ], b[ POINTER ]),
    );
}
