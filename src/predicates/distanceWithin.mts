import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
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
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const b = lineString([[ 1, 0 ], [ 5, 0 ]]);
 * const isWithin = distanceWithin(a, b, 2); // true
 */
export function distanceWithin(a: Geometry, b: Geometry, maxDistance: number): boolean {
    return Boolean(geos.GEOSDistanceWithin(a[ POINTER ], b[ POINTER ], maxDistance));
}
