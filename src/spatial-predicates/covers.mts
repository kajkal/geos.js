import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometry `b` lies in geometry `a`.
 *
 * Geometry `a` contains geometry `b` if all points of `b` are in the interior
 * or at the boundary of `a`.
 *
 * If either geometry is empty, returns `false`.
 *
 * `covers` is the converse of {@link coveredBy}: `covers(a, b) === coveredBy(b, a)`.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` covers geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link coveredBy} converse of `covers`
 * @see {@link contains} less inclusive `covers`
 * @see {@link containsProperly} less inclusive `contains`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live differences with 'contains'
 * const a = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const b = point([ 2, 10 ]);
 * const ab_contain = contains(a, b); // false - no interior point in common
 * const ab_cover = covers(a, b); // true
 *
 * const c = polygon([ [ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ], [ 10, 13 ] ] ]);
 * const d = lineString([ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ] ]);
 * const cd_contain = contains(c, d); // false - no interior point in common
 * const cd_cover = covers(c, d); // true
 */
export function covers(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedCovers(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSCovers(a[ POINTER ], b[ POINTER ]),
    );
}


/**
 * Returns `true` if geometry `a` lies in geometry `b`.
 *
 * Geometry `a` is covered by geometry `b` if all points of `a` are in the
 * interior or at the boundary of `b`.
 *
 * If either geometry is empty, returns `false`.
 *
 * `coveredBy` is the converse of {@link covers}: `coveredBy(a, b) === covers(b, a)`.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` is covered by geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link covers} converse of `coveredBy`
 * @see {@link within} less inclusive `coveredBy`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live differences with 'within'
 * const a = point([ 2, 0 ]);
 * const b = lineString([ [ 0, 3 ], [ 4, 5 ], [ 2, 0 ] ]);
 * const ab_within = within(a, b); // false
 * const ab_coveredBy = coveredBy(a, b); // true
 *
 * const g = lineString([ [ 12, 2 ], [ 14, 2 ], [ 14, 4 ] ]);
 * const h = polygon([
 *     [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ],
 *     [ [ 12, 2 ], [ 14, 2 ], [ 14, 4 ], [ 12, 4 ], [ 12, 2 ] ],
 * ]);
 * const gh_within = within(g, h); // false
 * const gh_coveredBy = coveredBy(g, h); // true
 */
export function coveredBy(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedCoveredBy(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSCoveredBy(a[ POINTER ], b[ POINTER ]),
    );
}
