import { type Geometry, GeometryRef } from './Geometry.mjs';
import { P_CLEANUP, P_FINALIZATION, P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


declare const __PREPARED__: unique symbol;

/**
 * Branded type representing one of [geometries]{@link Geometry} that was
 * [prepared]{@link prepare}.
 *
 * Geometry preparation is especially useful when a certain geometry will be
 * compared many times with other geometries when computing spatial predicates
 * or calculating distances.
 *
 * @template G - The type of prepared geometry, for example, {@link Geometry}
 * or more specific {@link Polygon}
 */
export type Prepared<G extends Geometry> = G & { [ __PREPARED__ ]: true }; // branded type


/**
 * Prepares geometry to optimize the performance of repeated calls to specific
 * geometric operations.
 *
 * The "prepared geometry" is conceptually similar to a database "prepared
 * statement": by doing up-front work to create an optimized object, you reap
 * a performance benefit when executing repeated function calls on that object.
 *
 * List of functions that benefit from geometry preparation:
 * - {@link distance}
 * - {@link nearestPoints}
 * - {@link distanceWithin}
 * - {@link intersects}
 * - {@link disjoint}
 * - {@link contains}
 * - {@link containsProperly}
 * - {@link within}
 * - {@link covers}
 * - {@link coveredBy}
 * - {@link crosses}
 * - {@link overlaps}
 * - {@link touches}
 * - {@link relate}
 * - {@link relatePattern}
 *
 * Modifies the geometry in-place.
 *
 * @template G - The type of prepared geometry, for example, {@link Geometry}
 * or more specific {@link Polygon}
 * @param geometry - Geometry to prepare
 * @returns Exactly the same geometry object, but with prepared internal
 * spatial indexes
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link unprepare} frees prepared indexes
 * @see {@link isPrepared} checks whether a geometry is prepared
 * @see {@link https://libgeos.org/usage/c_api/#prepared-geometry}
 *
 * @example lifecycle of the prepared geometry
 * const regularPolygon = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * const preparedPolygon = prepare(regularPolygon);
 * const regularPolygonAgain = unprepare(preparedPolygon);
 * // `regularPolygon`, `preparedPolygon` and `regularPolygonAgain` are exactly the same object
 * // so if you do not care about TypeScript, the above can be simplified to:
 * const p = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * prepare(p);
 * unprepare(p);
 *
 * @example to improve performance of repeated calls against a single geometry
 * const a = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * // `a` is a polygon with many vertices (4000 in this example)
 * prepare(a);
 * // the preparation of geometry `a` will improve the performance of repeated
 * // supported functions (see list above) calls, but only those where `a` is
 * // the first geometry
 * const d1 = distance(a, point([ 10, 0 ]));
 * const d2 = distance(a, point([ 10, 1 ]));
 * const d3 = distance(point([ 10, 2 ]), a); // no benefit from prepared geometry
 * const i1 = intersects(a, lineString([ [ 0, 22 ], [ 11, 0 ] ]));
 * const i2 = intersects(a, lineString([ [ 0, 24 ], [ 11, 0 ] ]));
 * const i3 = intersects(lineString([ [ 0, 26 ], [ 11, 0 ] ]), a); // no benefit
 */
export function prepare<G extends Geometry>(geometry: G): Prepared<G> {
    if (!geometry[ P_POINTER ]) {
        const pPtr = geos.GEOSPrepare(geometry[ POINTER ]);
        GeometryRef[ P_FINALIZATION ].register(geometry, pPtr, geometry);
        geometry[ P_POINTER ] = pPtr;
    }
    return geometry as Prepared<G>;
}


/**
 * Frees the prepared internal spatial indexes.
 *
 * Call this function when you no longer need a performance boost, but need
 * the geometry itself and want to reclaim some memory.
 *
 * The prepared internal spatial indexes will be automatically freed alongside
 * the geometry itself, either when released via [`free`]{@link GeometryRef#free}
 * or when geometry goes out of scope.
 *
 * Modifies the geometry in-place.
 *
 * @template G - The type of prepared geometry, for example, {@link Geometry}
 * or more specific {@link Polygon}
 * @param geometry - Geometry to free its prepared indexes
 * @returns Exactly the same geometry object, but without prepared internal
 * spatial indexes
 *
 * @see {@link prepare} prepares geometry internal spatial indexes
 * @see {@link isPrepared} checks whether a geometry is prepared
 * @see {@link https://libgeos.org/usage/c_api/#prepared-geometry}
 *
 * @example lifecycle of the prepared geometry
 * const regularPolygon = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * const preparedPolygon = prepare(regularPolygon);
 * const regularPolygonAgain = unprepare(preparedPolygon);
 * // `regularPolygon`, `preparedPolygon` and `regularPolygonAgain` are exactly the same object
 * // so if you do not care about TypeScript, the above can be simplified to:
 * const p = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * prepare(p);
 * unprepare(p);
 */
export function unprepare<G extends Geometry>(geometry: Prepared<G>): G {
    if (geometry[ P_POINTER ]) {
        GeometryRef[ P_FINALIZATION ].unregister(geometry);
        GeometryRef[ P_CLEANUP ](geometry[ P_POINTER ]);
        delete geometry[ P_POINTER ];
    }
    return geometry as G;
}
