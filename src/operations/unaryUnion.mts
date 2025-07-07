import type { PrecisionGridOptions } from './types/PrecisionGridOptions.mjs';
import { POINTER } from '../core/symbols.mjs';
import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the (self) union of all components of geometry `a`.
 * This is particularly useful for reducing MultiGeometries or
 * GeometryCollections into their minimal representation, merging
 * overlapping elements and removing duplicates.
 *
 * @param a - Geometry
 * @param options - Optional options object
 * @returns A new geometry representing the union of all components
 *
 * @example #live dissolving overlapping polygons in a MultiPolygon
 * const a = fromWKT('MULTIPOLYGON (((0 0, 0 10, 10 10, 10 0, 0 0), (1 9, 8 8, 9 1, 1 9)), ((5 10, 15 15, 10 5, 5 10)))');
 * const a_uUnion = unaryUnion(a);
 * // 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.166666666666666 6.833333333333333, 6.833333333333333 8.166666666666666, 1 9))'
 * const a_uUnion_pg = unaryUnion(a, { gridSize: 1e-4 });
 * // 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.1667 6.8333, 6.8333 8.1667, 1 9))'
 *
 * @example #live should remove duplicated points
 * const a = multiPoint([ [ 4, 5 ], [ 6, 7 ], [ 4, 5 ], [ 6, 5 ], [ 6, 7 ] ]);
 * const a_uUnion = unaryUnion(a); // 'MULTIPOINT ((4 5), (6 5), (6 7))'
 * const a_uUnion_pg = unaryUnion(a, { gridSize: 2 }); // 'MULTIPOINT ((4 6), (6 6), (6 8))'
 */
export function unaryUnion(a: Geometry, options?: PrecisionGridOptions): Geometry {
    const geomPtr = (options?.gridSize != null)
        ? geos.GEOSUnaryUnionPrec(a[ POINTER ], options.gridSize)
        : geos.GEOSUnaryUnion(a[ POINTER ]);
    return new GeometryRef(geomPtr) as Geometry;
}
