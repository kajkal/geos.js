import { POINTER } from '../core/symbols.mjs';
import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { Geometry } from '../geom/Geometry.mjs';
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
 * @example difference of two lines
 * const a = fromWKT('LINESTRING (2 8, 10 8)');
 * const b = fromWKT('LINESTRING (4.123456789 8, 10 8)');
 * toWKT(difference(a, b)); // 'LINESTRING (2 8, 4.123456789 8)'
 * toWKT(difference(a, b, { gridSize: 1e-6 })); // 'LINESTRING (2 8, 4.123457 8)'
 */
export function difference(a: Geometry, b: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSDifferencePrec(a[ POINTER ], b[ POINTER ], options.gridSize)
        : geos.GEOSDifference(a[ POINTER ], b[ POINTER ]);
    return new Geometry(geomPtr);
}
