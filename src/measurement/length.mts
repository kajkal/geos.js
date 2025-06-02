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
 * @example #live
 * const pt = point([ 0, 1 ]);
 * const ptLength = length(pt); // 0
 * const line = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
 * const lineLength = length(line); // 1.4142135623730951 = Math.sqrt(2)
 * const poly = polygon([ [ [ 1, 0 ], [ 2, 1 ], [ 3, 0 ], [ 1, 0 ] ] ]);
 * const polyLength = length(poly); // 4.82842712474619 = Math.sqrt(2) * 2 + 2
 */
export function length(geometry: Geometry): number {
    const f = geos.f1;
    geos.GEOSLength(geometry[ POINTER ], f[ POINTER ]);
    return f.get();
}
