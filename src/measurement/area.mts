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
 * @example
 * const poly = polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
 * area(poly); // 0.5
 */
export function area(geometry: Geometry): number {
    const f = geos.f1;
    geos.GEOSArea(geometry[ POINTER ], f[ POINTER ]);
    return f.get();
}
