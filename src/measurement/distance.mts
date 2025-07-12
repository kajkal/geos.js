import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { isEmpty } from '../predicates/isEmpty.mjs';


/**
 * Computes the Cartesian distance between geometry `a` and geometry `b`.
 *
 * Distance is in input geometry units.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns The distance between geometries
 * @throws {GEOSError} on unsupported geometry types (curved)
 * @throws {GEOSError} when either geometry is empty
 *
 * @see {@link distanceWithin} returns `true` when two geometries are within a given distance
 * @see {@link nearestPoints} finds the nearest points of two geometries
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live distance between point and line
 * const a = point([ 0, 0 ]);
 * const b = lineString([ [ 0, 1 ], [ 1, 0 ] ]);
 * const ab_dist = distance(a, b); // 0.7071067811865476 = Math.sqrt(2) / 2
 *
 * @example #live distance between line and polygon
 * const a = lineString([ [ -1, 1 ], [ 1, -1 ] ]);
 * const b = polygon([ [ [ 1, 1 ], [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ] ]);
 * const ab_dist = distance(a, b); // 1.4142135623730951 = Math.sqrt(2)
 *
 * @example #live distance between two polygons
 * const a = polygon([ [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ], [ 0, 0 ] ] ]);
 * const b = polygon([ [ [ 2, 2 ], [ 3, 2 ], [ 3, 3 ], [ 2, 2 ] ] ]);
 * const ab_dist = distance(a, b); // 1.4142135623730951 = Math.sqrt(2)
 */
export function distance(a: Geometry | Prepared<Geometry>, b: Geometry): number {
    const f = geos.f1;
    a[ P_POINTER ]
        ? geos.GEOSPreparedDistance(a[ P_POINTER ], b[ POINTER ], f[ POINTER ])
        : geos.GEOSDistance(a[ POINTER ], b[ POINTER ], f[ POINTER ]);
    const dist = f.get();
    if (!dist && (isEmpty(a) || isEmpty(b))) {
        throw new GEOSError('"distance" called with empty inputs');
    }
    return dist;
}
