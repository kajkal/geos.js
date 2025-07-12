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
 * const b = lineString([ [ 0, 10 ], [ 10, 0 ] ]);
 * const d = distance(a, b); // 7.0710678118654755 = 5 * Math.sqrt(2)
 * const dwithin_70 = distanceWithin(a, b, 7.0); // false
 * const dwithin_71 = distanceWithin(a, b, 7.1); // true
 */
export function distanceWithin(a: Geometry | Prepared<Geometry>, b: Geometry, maxDistance: number): boolean {
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedDistanceWithin(a[ P_POINTER ], b[ POINTER ], maxDistance)
            : geos.GEOSDistanceWithin(a[ POINTER ], b[ POINTER ], maxDistance),
    );
}
