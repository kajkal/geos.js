import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` spatially cross.
 *
 * Geometry `a` crosses geometry `b` if both geometries have some, but not all
 * interior points in common, and the dimension of their intersection must be
 * lower than the maximum dimension of either `a` or `b`.
 *
 * Operation is valid for the following situations:
 * - Point/Line and Line/Point (Point intersection),
 * - Point/Area and Area/Point (Point intersection),
 * - Line/Area and Area/Line (Line intersection),
 * - Line/Line (Point intersection).
 *
 * Always returns `false` for Point/Point and Area/Area situations.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometries `a` and `b` spatially cross
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live crosses: true
 * const a = lineString([ [ 0, 13 ], [ 3, 14 ], [ 5, 10 ] ]);
 * const b = multiPoint([ [ 2, 16 ], [ 3, 14 ], [ 6, 14 ], [ 1, 10 ] ]);
 * const ab_cross = crosses(a, b); // true
 *
 * const c = polygon([ [ [ 11, 13 ], [ 14, 16 ], [ 15, 12 ], [ 11, 13 ] ] ]);
 * const d = multiPoint([ [ 12, 16 ], [ 13, 14 ], [ 16, 14 ], [ 11, 10 ] ]);
 * const cd_cross = crosses(c, d); // true
 *
 * const e = polygon([ [ [ 1, 1 ], [ 1, 4 ], [ 4, 4 ], [ 4, 1 ], [ 1, 1 ] ] ]);
 * const f = lineString([ [ 0, 3 ], [ 4, 5 ], [ 2, 0 ] ]);
 * const ef_cross = crosses(e, f); // true
 *
 * const g = lineString([ [ 10, 3 ], [ 14, 5 ], [ 12, 0 ] ]);
 * const h = lineString([ [ 11, 5 ], [ 15, 0 ] ]);
 * const gh_cross = crosses(g, h); // true
 *
 * @example #live crosses: false
 * const a = lineString([ [ 0, 13 ], [ 3, 14 ], [ 5, 10 ] ]);
 * const b = point([ 3, 14 ]);
 * const ab_cross = crosses(a, b); // false - all interior points in common
 *
 * const c = polygon([ [ [ 11, 13 ], [ 14, 16 ], [ 15, 12 ], [ 11, 13 ] ] ]);
 * const d = multiPoint([ [ 13, 14 ], [ 14, 13 ] ]);
 * const cd_cross = crosses(c, d); // false - all interior points in common
 *
 * const e = polygon([ [ [ 1, 1 ], [ 1, 4 ], [ 4, 4 ], [ 4, 1 ], [ 1, 1 ] ] ]);
 * const f = lineString([ [ 1, 3 ], [ 4, 4 ], [ 2, 1 ] ]);
 * const ef_cross = crosses(e, f); // false - all interior points in common
 *
 * const g = lineString([ [ 10, 5 ], [ 15, 0 ] ]);
 * const h = lineString([ [ 10, 2 ], [ 12, 3 ], [ 13, 2 ], [ 15, 3 ] ]);
 * const gh_cross = crosses(g, h); // false - intersection is line not a point
 */
export function crosses(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedCrosses(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSCrosses(a[ POINTER ], b[ POINTER ]),
    );
}
