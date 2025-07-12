import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` if geometries `a` and `b` spatially overlap.
 *
 * Geometry `a` overlaps geometry `b` if both geometries have some, but not all
 * points in common, they have the same dimension and the intersection of their
 * interiors has the same dimension as the geometries themselves.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns `true` if geometry `a` overlaps geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live overlaps: true
 * const a = multiPoint([ [ 2, 6 ], [ 3, 4 ], [ 6, 4 ], [ 1, 0 ] ]);
 * const b = multiPoint([ [ 0, 3 ], [ 3, 4 ], [ 4, 2 ], [ 5, 5 ] ]);
 * const ab_overlap = overlaps(a, b); // true
 *
 * const c = lineString([ [ 10, 5 ], [ 15, 0 ] ]);
 * const d = lineString([ [ 10, 2 ], [ 12, 3 ], [ 13, 2 ], [ 15, 3 ] ]);
 * const cd_overlap = overlaps(c, d); // true
 *
 * const e = polygon([ [ [ 18, 0 ], [ 18, 7 ], [ 22, 7 ], [ 22, 0 ], [ 18, 0 ] ] ]);
 * const f = polygon([ [ [ 20, 1 ], [ 20, 4 ], [ 26, 4 ], [ 26, 1 ], [ 20, 1 ] ] ]);
 * const ef_overlap = overlaps(e, f); // true
 *
 * @example #live overlaps: false
 * const a = multiPoint([ [ 2, 6 ], [ 3, 4 ], [ 6, 4 ], [ 1, 0 ] ]);
 * const b = multiPoint([ [ 1, 0 ], [ 3, 4 ] ]);
 * const ab_overlap = overlaps(a, b); // false - all points from `b` are within `a`
 *
 * const c = lineString([ [ 13, 5 ], [ 12, 0 ] ]);
 * const d = lineString([ [ 10, 2 ], [ 12, 3 ], [ 13, 2 ], [ 15, 3 ] ]);
 * const cd_overlap = overlaps(c, d); // false - intersection has lower dimension (point instead of line)
 *
 * const e = polygon([ [ [ 18, 0 ], [ 18, 7 ], [ 22, 7 ], [ 22, 0 ], [ 18, 0 ] ] ]);
 * const f = polygon([ [ [ 22, 1 ], [ 22, 4 ], [ 26, 4 ], [ 26, 1 ], [ 22, 1 ] ] ]);
 * const ef_overlap = overlaps(e, f); // false - intersection has lower dimension (line instead of polygon)
 *
 * const g = polygon([ [ [ 30, 0 ], [ 30, 5 ], [ 35, 5 ], [ 35, 0 ], [ 30, 0 ] ] ]);
 * const h = lineString([ [ 29, 2 ], [ 36, 3 ] ]);
 * const gh_overlap = overlaps(g, h); // false - different dimensions cannot overlap
 */
export function overlaps(a: Geometry | Prepared<Geometry>, b: Geometry): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedOverlaps(a[ P_POINTER ], b[ POINTER ])
            : geos.GEOSOverlaps(a[ POINTER ], b[ POINTER ]),
    );
}
