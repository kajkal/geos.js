import type { DensifyOptions } from './types/DensifyOptions.mjs';
import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Compute the discrete Fréchet distance between geometry `a` and geometry `b`.
 * The [Fréchet distance]{@link https://en.wikipedia.org/wiki/Fr%C3%A9chet_distance}
 * is a measure of similarity: it is the greatest distance between any point in
 * `a` and the closest point in `b`.
 *
 * The discrete distance is an approximation of this metric: only vertices are
 * considered. The parameter `options.densify` makes this approximation less coarse
 * by splitting the line segments between vertices before computing the distance.
 *
 * Fréchet distance sweep continuously along their respective curves and the
 * direction of curves is significant. This makes it a better measure of similarity
 * than Hausdorff distance for curve or surface matching.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param options - Optional options object
 * @returns Approximation of Fréchet distance between geometries
 * @throws {GEOSError} on unsupported geometry types (curved)
 * @throws {GEOSError} when either geometry is empty
 * @throws {GEOSError} when `options.densify` is not in the range `(0.001, 1.0]`
 *
 * @see {@link hausdorffDistance}
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 100, 0 ] ]);
 * const b = lineString([ [ 0, 0 ], [ 50, 50 ], [ 100, 0 ] ]);
 * const ab_fDist = frechetDistance(a, b); // 70.71067811865476
 * const ab_fDist_d = frechetDistance(a, b, { densify: 0.5 }); // 50
 *
 * @example #live with a comparison to Hausdorff distance
 * const a = lineString([ [ 0, 0 ], [ 50, 200 ], [ 100, 0 ], [ 150, 200 ], [ 200, 0 ] ]);
 * const b1 = lineString([ [ 0, 200 ], [ 200, 150 ], [ 0, 100 ], [ 200, 50 ], [ 0, 0 ] ]);
 * const b2 = lineString([ [ 0, 0 ], [ 200, 50 ], [ 0, 100 ], [ 200, 150 ], [ 0, 200 ] ]);
 * const ab1_hDist = hausdorffDistance(a, b1); // 48.507125007266595
 * const ab2_hDist = hausdorffDistance(a, b2); // 48.507125007266595
 * const ab1_fDist = frechetDistance(a, b1); // 200
 * const ab2_fDist = frechetDistance(a, b2); // 282.842712474619
 */
export function frechetDistance(a: Geometry, b: Geometry, options?: DensifyOptions): number {
    const f = geos.f1;
    (options?.densify != null)
        ? geos.GEOSFrechetDistanceDensify(a[ POINTER ], b[ POINTER ], options.densify, f[ POINTER ])
        : geos.GEOSFrechetDistance(a[ POINTER ], b[ POINTER ], f[ POINTER ]);
    return f.get();
}
