import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Calculates the length of a geometry.
 *
 * Linear geometries return their length.
 * Areal geometries return their perimeter.
 * Others return 0.
 *
 * @param geometry - The geometry for which the length is calculated
 * @returns The length of the geometry
 *
 * @example
 * const line = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
 * length(line); // 1.4142135623730951 = Math.sqrt(2)
 */
export function length(geometry: Geometry): number {
    const f = geos.f1;
    geos.GEOSLength(geometry[ POINTER ], f[ POINTER ]);
    return f.get();
}
