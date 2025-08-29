import type { DensifyOptions } from './types/DensifyOptions.mjs';
import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the discrete Hausdorff distance between geometry `a` and geometry `b`.
 * The [Hausdorff distance]{@link https://en.wikipedia.org/wiki/Hausdorff_distance}
 * is a measure of similarity: it is the greatest distance between any point in
 * `a` and the closest point in `b`.
 *
 * The discrete distance is an approximation of this metric: only vertices are
 * considered. The parameter `options.densify` makes this approximation less coarse
 * by splitting the line segments between vertices before computing the distance.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param options - Optional options object
 * @returns Approximation of Hausdorff distance between geometries
 * @throws {GEOSError} on unsupported geometry types (curved)
 * @throws {GEOSError} when either geometry is empty
 * @throws {GEOSError} when `options.densify` is not in the range `(0.0, 1.0]`
 *
 * @see {@link frechetDistance}
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 100, 0 ], [ 10, 100 ] ]);
 * const b = lineString([ [ 0, 100 ], [ 0, 10 ], [ 80, 10 ] ]);
 * const ab_hDist = hausdorffDistance(a, b); // 22.360679774997898 - approximation is not close
 * const ab_hDist_d = hausdorffDistance(a, b, { densify: 0.001 }); // 47.89
 */
export function hausdorffDistance(a: Geometry, b: Geometry, options?: DensifyOptions): number {
    const f = geos.f1;
    (options?.densify != null)
        ? geos.GEOSHausdorffDistanceDensify(a[ POINTER ], b[ POINTER ], options.densify, f[ POINTER ])
        : geos.GEOSHausdorffDistance(a[ POINTER ], b[ POINTER ], f[ POINTER ]);
    const dist = f.get();
    if (isNaN(dist)) {
        throw new GEOSError(`"hausdorffDistance" called with empty inputs`);
    }
    return dist;
}
