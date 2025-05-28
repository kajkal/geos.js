import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns whether the geometry is empty.
 * If the geometry or any component is non-empty, the geometry is non-empty.
 * An empty geometry has no boundary or interior.
 *
 * @param geometry - The geometry to check
 * @returns `true` when geometry is empty, `false` otherwise
 *
 * @example
 * const a = point([]);
 * const aIsEmpty = isEmpty(a); // true
 * const b = point([ 0, 0 ]);
 * const bIsEmpty = isEmpty(b); // false
 */
export function isEmpty(geometry: Geometry): boolean {
    return Boolean(geos.GEOSisEmpty(geometry[ POINTER ]));
}
