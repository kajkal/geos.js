import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the symmetric difference of geometry `a` with geometry `b`.
 * The result is a geometry that contains all points that are in either
 * geometry but not in both geometries (the union minus the intersection).
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param options - Optional options object
 * @returns A new geometry representing the symmetric difference
 *
 * @example symmetric difference of two lines
 * const a = fromWKT('LINESTRING(50 100, 50 200)');
 * const b = fromWKT('LINESTRING(50 50, 50 150)');
 * toWKT(symmetricDifference(a, b)); // 'MULTILINESTRING ((50 150, 50 200), (50 50, 50 100))'
 * toWKT(symmetricDifference(a, b, { gridSize: 15 })); // 'MULTILINESTRING ((45 150, 45 195), (45 45, 45 105))'
 */
export function symmetricDifference(a: Geometry, b: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSSymDifferencePrec(a[ POINTER ], b[ POINTER ], options.gridSize)
        : geos.GEOSSymDifference(a[ POINTER ], b[ POINTER ]);
    return new Geometry(geomPtr);
}
