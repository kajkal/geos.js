import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Calculates the bounds (also named bbox - bounding box or extent) of the geometry.
 * The bounds are the minimum rectangle that contains the entire geometry.
 *
 * @param geometry - The geometry for which the bounds are calculated
 * @returns An array of four numbers `[ xMin, yMin, xMax, yMax ]`
 * @throws {GEOSError} when called on an empty geometry
 *
 * @see {@link box} creates Polygon geometry from the bounds array
 *
 * @example #live
 * const pt = point([ 3, 1 ]);
 * const ptExtent = bounds(pt); // [ 3, 1, 3, 1 ]
 * const poly = polygon([ [ [ 3, 3 ], [ 9, 4 ], [ 5, 1 ], [ 3, 3 ] ] ]);
 * const polyExtent = bounds(poly); // [ 3, 1, 9, 4 ]
 */
export function bounds(geometry: Geometry): [ xMin: number, yMin: number, xMax: number, yMax: number ] {
    const xMin = geos.f1, yMin = geos.f2, xMax = geos.f3, yMax = geos.f4;
    if (geos.GEOSGeom_getExtent(geometry[ POINTER ], xMin[ POINTER ], yMin[ POINTER ], xMax[ POINTER ], yMax[ POINTER ])) {
        return [ xMin.get(), yMin.get(), xMax.get(), yMax.get() ];
    }
    throw new GEOSError('Cannot calculate bounds of an empty geometry');
}
