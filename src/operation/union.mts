import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the union of geometry `a` with geometry `b`.
 * The result is a geometry that contains all points that
 * are in either geometry `a` or geometry `b`.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param gridSize - Optional precision grid size for snapping vertices
 * @returns A new geometry representing the union
 *
 * @example union of two polygons
 * const a = fromWKT('POLYGON ((10.01 10, 10 5, 5 5, 5 10, 10.01 10))');
 * const b = fromWKT('POLYGON ((10 15, 15 15, 15 7, 10.01 7, 10 15))');
 * toWKT(union(a, b)); // 'POLYGON ((10 5, 5 5, 5 10, 10.00625 10, 10 15, 15 15, 15 7, 10.01 7, 10.007692307692308 8.846153846153847, 10 5))'
 * toWKT(union(a, b, 0.1)); // 'POLYGON ((10 5, 5 5, 5 10, 10 10, 10 15, 15 15, 15 7, 10 7, 10 5))'
 */
export function union(a: Geometry, b: Geometry, gridSize?: number): Geometry {
    const geomPtr = (gridSize != null)
        ? geos.GEOSUnionPrec(a[ POINTER ], b[ POINTER ], gridSize)
        : geos.GEOSUnion(a[ POINTER ], b[ POINTER ]);
    return new Geometry(geomPtr);
}
