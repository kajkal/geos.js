import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the intersection of geometry `a` with geometry `b`.
 * The result is a geometry that contains all points that are both
 * in geometry `a` and geometry `b`.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param gridSize - Optional precision grid size for snapping vertices
 * @returns A new geometry representing the intersection
 *
 * @example intersection of two lines
 * const a = fromWKT('LINESTRING (0 0, 10 10)');
 * const b = fromWKT('LINESTRING (0 1, 10 4)');
 * toWKT(intersection(a, b)); // 'POINT (1.4285714285714286 1.4285714285714286)'
 * toWKT(intersection(a, b, 1e-6)); // 'POINT (1.428571 1.428571)'
 */
export function intersection(a: Geometry, b: Geometry, gridSize?: number): Geometry {
    const geomPtr = (gridSize != null)
        ? geos.GEOSIntersectionPrec(a[ POINTER ], b[ POINTER ], gridSize)
        : geos.GEOSIntersection(a[ POINTER ], b[ POINTER ]);
    return new Geometry(geomPtr);
}
