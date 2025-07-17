import { POINTER } from '../core/symbols.mjs';
import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


export interface SimplifyOptions {

    /**
     * Whether to preserve the original topology during simplification.
     *
     * When `true`, a topology‐preserving variant of the Douglas–Peucker
     * algorithm is used. The output will be [valid]{@link isValid} and
     * [simple]{@link isSimple} if the input is.
     * This option is computationally more expensive.
     *
     * When `false`, the standard Douglas–Peucker simplification is used,
     * which may produce invalid or self‐intersecting geometries.
     *
     * @default true
     */
    preserveTopology?: boolean;

}

/**
 * Computes a simplified representation of a geometry using the [Douglas-Peucker algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm).
 *
 * Simplification reduces the number of vertices by removing those which are
 * within the tolerance distance of the simplified linework.
 *
 * The simplification tolerance is in input geometry units.
 *
 * @param geometry - The geometry to simplify
 * @param tolerance - The maximum allowed deviation - any vertex within this distance
 * of the simplified linework is removed
 * @param options - Optional options object
 * @returns A new, simplified, geometry without "unnecessary" vertices
 * @throws {GEOSError} when `tolerance` is negative
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @example #live
 * const o1 = multiLineString([
 *     [ [ 10, 60 ], [ 39, 50 ], [ 70, 60 ], [ 90, 53 ] ],
 *     [ [ 35, 55 ], [ 46, 55 ] ],
 *     [ [ 65, 55 ], [ 75, 55 ] ],
 *     [ [ 10, 40 ], [ 40, 30 ], [ 70, 40 ], [ 90, 30 ] ],
 * ]);
 * const s1 = simplify(o1, 10);
 *
 * const o2 = multiLineString([
 *     [ [ 110, 60 ], [ 139, 50 ], [ 170, 60 ], [ 190, 53 ] ],
 *     [ [ 135, 55 ], [ 146, 55 ] ],
 *     [ [ 165, 55 ], [ 175, 55 ] ],
 *     [ [ 110, 40 ], [ 140, 30 ], [ 170, 40 ], [ 190, 30 ] ],
 * ]);
 * const s2 = simplify(o2, 10, { preserveTopology: false });
 *
 * @example #live
 * const o1 = multiPolygon([
 *     [
 *         [ [ 10, 10 ], [ 10, 20 ], [ 20, 70 ], [ 10, 80 ], [ 20, 80 ], [ 50, 90 ], [ 70, 80 ], [ 90, 80 ], [ 85, 20 ], [ 90, 10 ], [ 50, 0 ], [ 10, 10 ] ],
 *         [ [ 80, 20 ], [ 20, 20 ], [ 50, 90 ], [ 80, 20 ] ],
 *         [ [ 30, 9 ], [ 70, 9 ], [ 50, 0 ], [ 30, 9 ] ],
 *     ],
 *     [ [ [ 0, 50 ], [ 0, 75 ], [ 15, 65 ], [ 5, 30 ], [ 0, 50 ] ] ],
 *     [ [ [ 90, 20 ], [ 95, 60 ], [ 95, 10 ], [ 90, 20 ] ] ],
 * ]);
 * const s1 = simplify(o1, 10);
 *
 * const o2 = multiPolygon([
 *     [
 *         [ [ 130, 10 ], [ 130, 20 ], [ 140, 70 ], [ 130, 80 ], [ 140, 80 ], [ 170, 90 ], [ 190, 80 ], [ 210, 80 ], [ 205, 20 ], [ 210, 10 ], [ 170, 0 ], [ 130, 10 ] ],
 *         [ [ 200, 20 ], [ 140, 20 ], [ 170, 90 ], [ 200, 20 ] ],
 *         [ [ 150, 9 ], [ 190, 9 ], [ 170, 0 ], [ 150, 9 ] ],
 *     ],
 *     [ [ [ 120, 50 ], [ 120, 75 ], [ 135, 65 ], [ 125, 30 ], [ 120, 50 ] ] ],
 *     [ [ [ 210, 20 ], [ 215, 60 ], [ 215, 10 ], [ 210, 20 ] ] ],
 * ]);
 * const s2 = simplify(o2, 10, { preserveTopology: false });
 *
 */
export function simplify(geometry: Geometry, tolerance: number, options?: SimplifyOptions): Geometry {
    const geomPtr = options?.preserveTopology === false
        ? geos.GEOSSimplify(geometry[ POINTER ], tolerance)
        : geos.GEOSTopologyPreserveSimplify(geometry[ POINTER ], tolerance);
    return new GeometryRef(geomPtr) as Geometry;
}
