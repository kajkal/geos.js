import { POINTER } from '../core/symbols.mjs';
import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the difference of geometry `a` with geometry `b`.
 * The result is a geometry that contains all points that are in
 * geometry `a` but not in geometry `b`.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param options - Optional options object
 * @returns A new geometry representing the difference
 *
 * @example #live difference of two polygons
 * const a = polygon([ [ [ 0, 4 ], [ 5, 5 ], [ 4, 0 ], [ 0, 4 ] ] ]);
 * const b = polygon([ [ [ 0, 0 ], [ 5, 6 ], [ 9, 5 ], [ 0, 0 ] ] ]);
 * const ab_diff = difference(a, b);
 * const ab_diff_pg = difference(a, b, { gridSize: 0.1 });
 * const ba_diff = difference(b, a);
 *
 * @example #live difference of two lines
 * const a = lineString([ [ 2, 8 ], [ 10, 8 ] ]);
 * const b = lineString([ [ 4.123456789, 8 ], [ 10, 8 ] ]);
 * const ab_diff = difference(a, b); // 'LINESTRING (2 8, 4.123456789 8)'
 * const ab_diff_pg = difference(a, b, { gridSize: 1e-6 }); // 'LINESTRING (2 8, 4.123457 8)'
 */
export function difference(a: Geometry, b: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSDifferencePrec(a[ POINTER ], b[ POINTER ], options.gridSize)
        : geos.GEOSDifference(a[ POINTER ], b[ POINTER ]);
    return new GeometryRef(geomPtr) as Geometry;
}
