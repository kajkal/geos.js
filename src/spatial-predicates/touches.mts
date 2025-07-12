import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if the only points in common between geometry `a` and `b`
 * are on their boundaries.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if `a` intersect with `b`, but their interiors do not intersect
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live touches: true
 * const a = lineString([ [ 0, 10 ], [ 2, 14 ], [ 5, 15 ] ]);
 * const b = point([ 0, 10 ]);
 * const ab_touch = touches(a, b); // true
 *
 * const c = lineString([ [ 10, 10 ], [ 12, 14 ], [ 15, 15 ] ]);
 * const d = lineString([ [ 13, 10 ], [ 11, 12 ] ]);
 * const cd_touch = touches(c, d); // true
 *
 * const e = lineString([ [ 20, 10 ], [ 22, 14 ], [ 25, 15 ] ]);
 * const f = polygon([ [ [ 22, 10 ], [ 21, 12 ], [ 25, 13 ], [ 25, 10 ], [ 22, 10 ] ] ]);
 * const ef_touch = touches(e, f); // true
 *
 * const g = polygon([ [ [ 2, 0 ], [ 1, 2 ], [ 5, 3 ], [ 5, 0 ], [ 2, 0 ] ] ]);
 * const h = point([ 1, 2 ]);
 * const gh_touch = touches(g, h); // true
 *
 * const i = polygon([ [ [ 12, 0 ], [ 11, 2 ], [ 15, 3 ], [ 15, 0 ], [ 12, 0 ] ] ]);
 * const j = polygon([ [ [ 11, 3 ], [ 12, 5 ], [ 15, 3 ], [ 11, 3 ] ] ]);
 * const ij_touch = touches(i, j); // true
 *
 * const k = polygon([ [ [ 22, 0 ], [ 21, 2 ], [ 25, 3 ], [ 25, 0 ], [ 22, 0 ] ] ]);
 * const l = polygon([ [ [ 21, 2 ], [ 22, 5 ], [ 25, 3 ], [ 21, 2 ] ] ]);
 * const kl_touch = touches(k, l); // true
 *
 * @example #live touches: false
 * const a = lineString([ [ 0, 10 ], [ 2, 14 ], [ 5, 15 ] ]);
 * const b = point([ 1, 12 ]);
 * const ab_touch = touches(a, b); // false
 *
 * const c = lineString([ [ 10, 10 ], [ 12, 14 ], [ 15, 15 ] ]);
 * const d = lineString([ [ 9, 13 ], [ 15, 15 ] ]);
 * const cd_touch = touches(c, d); // false
 *
 * const e = lineString([ [ 22, 11 ], [ 22, 14 ], [ 25, 15 ] ]);
 * const f = polygon([ [ [ 22, 10 ], [ 21, 12 ], [ 25, 13 ], [ 25, 10 ], [ 22, 10 ] ] ]);
 * const ef_touch = touches(e, f); // false
 *
 * const g = polygon([ [ [ 2, 0 ], [ 1, 2 ], [ 5, 3 ], [ 5, 0 ], [ 2, 0 ] ] ]);
 * const h = point([ 3, 1 ]);
 * const gh_touch = touches(g, h); // false
 *
 * const i = polygon([ [ [ 12, 0 ], [ 11, 2 ], [ 15, 3 ], [ 15, 0 ], [ 12, 0 ] ] ]);
 * const j = polygon([ [ [ 11, 3 ], [ 12, 5 ], [ 14, 2 ], [ 11, 3 ] ] ]);
 * const ij_touch = touches(i, j); // false
 *
 * const k = polygon([ [ [ 22, 0 ], [ 21, 2 ], [ 25, 3 ], [ 25, 0 ], [ 22, 0 ] ] ]);
 * const l = polygon([ [ [ 21, 2 ], [ 23, 1 ], [ 25, 3 ], [ 21, 2 ] ] ]);
 * const kl_touch = touches(k, l); // false
 */
export function touches(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedTouches(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSTouches(a[ POINTER ], b[ POINTER ]),
    );
}
