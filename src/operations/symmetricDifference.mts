import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { POINTER } from '../core/symbols.mjs';
import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';
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
 * @example #live symmetric difference of two lines
 * const a = lineString([ [ 50, 100 ], [ 50, 200 ] ]);
 * const b = lineString([ [ 50, 50 ], [ 50, 150 ] ]);
 * const ab_sDiff = symmetricDifference(a, b); // 'MULTILINESTRING ((50 150, 50 200), (50 50, 50 100))'
 * const ab_sDiff_pg = symmetricDifference(a, b, { gridSize: 15 }); // 'MULTILINESTRING ((45 150, 45 195), (45 45, 45 105))'
 * const ba_sDiff = symmetricDifference(b, a); // 'MULTILINESTRING ((50 50, 50 100), (50 150, 50 200))'
 */
export function symmetricDifference(a: Geometry, b: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSSymDifferencePrec(a[ POINTER ], b[ POINTER ], options.gridSize)
        : geos.GEOSSymDifference(a[ POINTER ], b[ POINTER ]);
    return new GeometryRef(geomPtr) as Geometry;
}
