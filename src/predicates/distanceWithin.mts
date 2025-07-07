import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` when the distance between two geometries is within the given
 * distance, `false` otherwise.
 *
 * Returns `false` when negative distance is given or when either geometry is empty.
 *
 * Distance is in input geometry units.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param maxDistance - The maximum distance
 * @returns `true` when the distance between the geometries is less than or equal
 * to the given distance, `false` otherwise
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link distance} computes the distance between two geometries
 * @see {@link nearestPoints} finds the nearest points of two geometries
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const b = lineString([[ 1, 0 ], [ 5, 0 ]]);
 * const isWithin = distanceWithin(a, b, 2); // true
 *
 * @example to improve performance of repeated calls against a single geometry
 * const a = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * // `a` is a polygon with many vertices (4000 in this example)
 * prepare(a);
 * // preparation of geometry `a` will improve the performance of repeated
 * // `distanceWithin` calls, but only those where `a` is the first geometry
 * const r1 = distanceWithin(a, point([ 12, 0 ]), 2);
 * const r2 = distanceWithin(a, point([ 12, 1 ]), 2);
 * const r3 = distanceWithin(point([ 12, 2 ]), a, 2); // no benefit from prepared geometry
 */
export function distanceWithin(a: Geometry | Prepared<Geometry>, b: Geometry, maxDistance: number): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedDistanceWithin(a[ P_POINTER ], b[ POINTER ], maxDistance)
            : geos.GEOSDistanceWithin(a[ POINTER ], b[ POINTER ], maxDistance),
    );
}
