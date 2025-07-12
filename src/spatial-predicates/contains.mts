import type { Geometry } from '../geom/Geometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { prepare, type Prepared } from '../geom/PreparedGeometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometry `b` lies in geometry `a` and their interiors intersect.
 *
 * Geometry `a` contains geometry `b` if all points of `b` are in the interior
 * or at the boundary of `a` and the interiors of `a` and `b` have at least one
 * point in common.
 *
 * Note:
 *   According to the definition above, a **geometry does not contain its
 *   boundary**, so for example, a LineString that is completely contained in
 *   the boundary of a Polygon is not considered to be contained in that Polygon.
 *
 *   In most cases {@link covers} should be used, as it has a simpler definition
 *   and allows for additional optimizations.
 *
 * `contains` is the converse of {@link within}: `contains(a, b) === within(b, a)`.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` contains geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link within} converse of `contains`
 * @see {@link covers} more inclusive `contains`
 * @see {@link containsProperly} less inclusive `contains`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live contains: true
 * const a = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const b = multiPoint([ [ 2, 10 ], [ 4, 15 ] ]);
 * const ab_contain = contains(a, b); // true
 *
 * const c = polygon([ [ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ], [ 10, 13 ] ] ]);
 * const d = multiPoint([ [ 12, 14 ], [ 13, 14 ] ]);
 * const cd_contain = contains(c, d); // true
 *
 * const e = polygon([ [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ] ]);
 * const f = lineString([ [ 0, 5 ], [ 5, 5 ], [ 0, 0 ] ]);
 * const ef_contain = contains(e, f); // true
 *
 * const g = polygon([ [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ] ]);
 * const h = polygon([ [ [ 11, 2 ], [ 14, 5 ], [ 15, 1 ], [ 11, 2 ] ] ]);
 * const gh_contain = contains(g, h); // true
 *
 * @example #live contains: false
 * const a = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const b = point([ 2, 10 ]);
 * const ab_contain = contains(a, b); // false - no interior point in common
 *
 * const c = polygon([ [ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ], [ 10, 13 ] ] ]);
 * const d = lineString([ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ] ]);
 * const cd_contain = contains(c, d); // false - no interior point in common
 *
 * const e = polygon([
 *     [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ],
 *     [ [ 2, 2 ], [ 2, 4 ], [ 4, 4 ], [ 4, 2 ], [ 2, 2 ] ],
 * ]);
 * const f = multiPoint([ [ 1, 1 ], [ 3, 3 ] ]);
 * const ef_contain = contains(e, f); // false
 *
 * const g = polygon([ [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ] ]);
 * const h = lineString([ [ 12, 1 ], [ 16, 1 ] ]);
 * const gh_contain = contains(g, h); // false
 */
export function contains(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedContains(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSContains(a[ POINTER ], b[ POINTER ]),
    );
}


/**
 * Returns `true` if geometry `b` lies in the interior of geometry `a`.
 *
 * Geometry `a` contains geometry `b` properly if all points of `b` are in the
 * interior of `a`.
 *
 * Info:
 *   This function needs the geometry `a` to be prepared.\
 *   If geometry `a` is not prepared this function will {@link prepare} it.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` contains geometry `b` properly
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link contains} more inclusive `containsProperly`
 * @see {@link covers} more inclusive `contains`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live differences with 'contains'
 * const a = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const b = multiPoint([ [ 2, 10 ], [ 4, 15 ] ]);
 * const ab_contain = contains(a, b); // true
 * const ab_containsProperly = containsProperly(a, b); // false - `b` intersect boundary of `a`
 *
 * const c = polygon([ [ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ], [ 10, 13 ] ] ]);
 * const d = multiPoint([ [ 12, 14 ], [ 13, 14 ] ]);
 * const cd_contain = contains(c, d); // true
 * const cd_containsProperly = containsProperly(c, d); // false - `b` intersect boundary of `a`
 *
 * const e = polygon([ [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ] ]);
 * const f = lineString([ [ 0, 5 ], [ 5, 5 ], [ 0, 0 ] ]);
 * const ef_contain = contains(e, f); // true
 * const ef_containsProperly = containsProperly(e, f); // false - `b` intersect boundary of `a`
 *
 * const g = polygon([ [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ] ]);
 * const h = polygon([ [ [ 11, 2 ], [ 14, 5 ], [ 15, 1 ], [ 11, 2 ] ] ]);
 * const gh_contain = contains(g, h); // true
 * const gh_containsProperly = containsProperly(g, h); // false - `b` intersect boundary of `a`
 *
 * @example #live above example, but adjusted to 'containsProperly'
 * const a = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const b = multiPoint([ [ 3, 12.5 ], [ 4, 15 ] ]);
 * const ab_containsProperly = containsProperly(a, b); // true
 *
 * const c = polygon([ [ [ 10, 13 ], [ 14, 15 ], [ 15, 10 ], [ 10, 13 ] ] ]);
 * const d = multiPoint([ [ 12, 13 ], [ 13, 14 ] ]);
 * const cd_containsProperly = containsProperly(c, d); // true
 *
 * const e = polygon([ [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ] ]);
 * const f = lineString([ [ 1, 4 ], [ 4, 4 ], [ 1, 1 ] ]);
 * const ef_containsProperly = containsProperly(e, f); // true
 *
 * const g = polygon([ [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ] ]);
 * const h = polygon([ [ [ 11, 2 ], [ 14, 4 ], [ 14, 1 ], [ 11, 2 ] ] ]);
 * const gh_containsProperly = containsProperly(g, h); // true
 */
export function containsProperly(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    if (!a[ P_POINTER ]) {
        prepare(a);
    }
    return Boolean(geos.GEOSPreparedContainsProperly(a[ P_POINTER ]!, b[ POINTER ]));
}


/**
 * Returns `true` if geometry `a` lies in geometry `b` and their interiors intersect.
 *
 * Geometry `a` is within geometry `b` if all points of `a` are in the interior
 * or at the boundary of `b` and the interiors of `a` and `b` have at least one
 * point in common.
 *
 * Note:
 *   According to the definition above, a **geometry does not contain its
 *   boundary**, so for example, a LineString that is completely contained in
 *   the boundary of a Polygon is not considered to be within that Polygon.
 *
 *   In most cases {@link coveredBy} should be used, as it has a simpler
 *   definition and allows for additional optimizations.
 *
 * `within` is the converse of {@link contains}: `within(a, b) === contains(b, a)`.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` is within geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link contains} converse of `within`
 * @see {@link coveredBy} more inclusive `within`
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = point([ 2, 10 ]);
 * const b = lineString([ [ 0, 13 ], [ 4, 15 ], [ 2, 10 ] ]);
 * const ab_within = within(a, b); // false
 *
 * const c = lineString([ [ 10, 13 ], [ 14, 15 ] ]);
 * const d = lineString([ [ 10, 13 ], [ 14, 15 ], [ 12, 10 ] ]);
 * const cd_within = within(c, d); // true
 *
 * const e = point([ 3, 3 ]);
 * const f = polygon([
 *     [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ],
 *     [ [ 2, 2 ], [ 4, 2 ], [ 4, 4 ], [ 2, 4 ], [ 2, 2 ] ],
 * ]);
 * const ef_within = within(e, f); // false
 *
 * const g = polygon([ [ [ 13, 0 ], [ 13, 2 ], [ 15, 2 ], [ 15, 0 ], [ 13, 0 ] ] ]);
 * const h = polygon([
 *     [ [ 10, 0 ], [ 10, 5 ], [ 15, 5 ], [ 15, 0 ], [ 10, 0 ] ],
 *     [ [ 12, 2 ], [ 14, 2 ], [ 14, 4 ], [ 12, 4 ], [ 12, 2 ] ],
 * ]);
 * const gh_within = within(g, h); // true
 */
export function within(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedWithin(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSWithin(a[ POINTER ], b[ POINTER ]),
    );
}
