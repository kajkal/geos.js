import { type Geometry } from '../geom/Geometry.mjs';
import { type Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER } from '../core/symbols.mjs';


/**
 * Checks whether a geometry is [prepared]{@link prepare}.
 *
 * @template G - The type of geometry, for example, {@link Geometry}
 * or more specific {@link Polygon}
 * @param geometry - The geometry to check
 * @returns `true` if geometry is prepared
 *
 * @see {@link prepare} prepares geometry internal spatial indexes
 * @see {@link unprepare} frees prepared indexes
 *
 * @example #live
 * const p = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * const before = isPrepared(p); // false
 * prepare(p);
 * const after = isPrepared(p); // true
 * unprepare(p);
 * const afterer = isPrepared(p); // false
 */
export function isPrepared<G extends Geometry>(geometry: G): geometry is Prepared<G> {
    return Boolean(geometry[ P_POINTER ]);
}
