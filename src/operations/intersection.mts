import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the intersection of geometry `a` with geometry `b`.
 * The result is a geometry that contains all points that are both
 * in geometry `a` and geometry `b`.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param options - Optional options object
 * @returns A new geometry representing the intersection
 *
 * @example #live intersection of two polygons
 * const a = polygon([ [ [ 0, 4 ], [ 5, 5 ], [ 4, 0 ], [ 0, 4 ] ] ]);
 * const b = polygon([ [ [ 0, 0 ], [ 5, 6 ], [ 9, 5 ], [ 0, 0 ] ] ]);
 * const ab_int = intersection(a, b);
 * const ab_int_pg = intersection(a, b, { gridSize: 0.1 });
 * const ba_int = intersection(b, a);
 *
 * @example #live intersection of two lines
 * const a = fromWKT('LINESTRING (0 0, 10 10)');
 * const b = fromWKT('LINESTRING (0 1, 10 4)');
 * const ab_int = intersection(a, b); // 'POINT (1.4285714285714286 1.4285714285714286)'
 * const ab_int_pg = intersection(a, b, { gridSize: 1e-6 }); // 'POINT (1.428571 1.428571)'
 */
export function intersection(a: Geometry, b: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSIntersectionPrec(a[ POINTER ], b[ POINTER ], options.gridSize)
        : geos.GEOSIntersection(a[ POINTER ], b[ POINTER ]);
    return new Geometry(geomPtr);
}
