import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Calculates the area of a geometry.
 *
 * Areal geometries have a non-zero area.
 * Others return 0.
 *
 * @param geometry - The geometry for which the area is calculated
 * @returns The area of the geometry
 *
 * @example #live
 * const pt = point([ 3, 1 ]);
 * const ptArea = area(pt); // 0
 * const line = lineString([ [ 8, 1 ], [ 9, 1 ] ]);
 * const lineArea = area(pt); // 0
 * const poly = polygon([ [ [ 3, 3 ], [ 9, 4 ], [ 5, 1 ], [ 3, 3 ] ] ]);
 * const polyArea = area(poly); // 7
 */
export function area(geometry: Geometry): number {
    const f = geos.f1;
    geos.GEOSArea(geometry[ POINTER ], f[ POINTER ]);
    return f.get();
}
