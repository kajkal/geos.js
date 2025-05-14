import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the (self) union of all components of geometry `a`.
 * This is particularly useful for reducing MultiGeometries or
 * GeometryCollections into their minimal representation, merging
 * overlapping elements and removing duplicates.
 *
 * @param a - Geometry
 * @param gridSize - Optional precision grid size for snapping vertices
 * @returns A new geometry representing the union of all components
 *
 * @example should remove duplicated points
 * const a = fromWKT('MULTIPOINT ((4 5), (6 7), (4 5), (6 5), (6 7))');
 * toWKT(unaryUnion(a)); // 'MULTIPOINT ((4 5), (6 5), (6 7))'
 * toWKT(unaryUnion(a, 2)); // 'MULTIPOINT ((4 6), (6 6), (6 8))'
 *
 * @example dissolving overlapping polygons in a MultiPolygon
 * const a = fromWKT('MULTIPOLYGON (((0 0, 0 10, 10 10, 10 0, 0 0), (1 9, 8 8, 9 1, 1 9)), ((5 10, 15 15, 10 5, 5 10)))');
 * toWKT(unaryUnion(a)); // 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.166666666666666 6.833333333333333, 6.833333333333333 8.166666666666666, 1 9))'
 * toWKT(unaryUnion(a, 1e-4)); // 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.1667 6.8333, 6.8333 8.1667, 1 9))'
 */
export function unaryUnion(a: Geometry, gridSize?: number): Geometry {
    const geomPtr = (gridSize != null)
        ? geos.GEOSUnaryUnionPrec(a[ POINTER ], gridSize)
        : geos.GEOSUnaryUnion(a[ POINTER ]);
    return new Geometry(geomPtr);
}
