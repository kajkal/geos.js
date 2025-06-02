import type { Point as GeoJSONPoint } from 'geojson';
import type { GEOSGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { jsonifyGeometry } from '../io/jsonify.mjs';
import { geos } from '../core/geos.mjs';


export class TopologyValidationError extends GEOSError {
    /** Array with X and Y coordinates of the point at which the error occurred. */
    location: [ x: number, y: number ];
    /** @internal */
    constructor(message: string, location: number[]) {
        super(message);
        this.name = 'TopologyValidationError';
        this.location = location as [ number, number ];
    }
}


export interface IsValidOptions {

    /**
     * Sets how to treat a polygon with self-touching rings.
     *
     * If set to `true` the following self-touching conditions are treated
     * as being valid (ESRI SDE model):
     * - **inverted shell** - the shell ring self-touches to create a hole
     *   touching the shell
     * - **exverted hole** - a hole ring self-touches to create two holes
     *   touching at a point
     *
     * If set to `false` the above conditions, following the OGC SFS standard,
     * are treated as not valid.
     *
     * @default false
     */
    isInvertedRingValid?: boolean;

}


/**
 * Returns `true` when the geometry is well-formed and valid in 2D according to
 * the OGC rules. For geometries with 3 and 4 dimensions, the validity is still
 * only tested in 2 dimensions.
 *
 * Validity is defined for each Geometry type as follows:
 * - Point coordinates must be finite (not `NaN` or `Infinity`)
 * - MultiPoint points must all be valid
 * - LineString must have at least 2 unique points
 * - MultiLineString lines must all be valid
 * - LinearRing must have at lest 4 unique points, be closed (first and last
 *   point must be equal), be [simple]{@link isSimple} i.e. must not self-intersect
 *   except at endpoints
 * - Polygon interior must be connected (some hole cannot split interior into parts)
 *   - Shell (exterior ring) must be a valid LinearRing, not be self-touching
 *     (could be configured by `options.isInvertedRingValid` parameter),
 *     not be exverted ("bow-tie" configuration)
 *   - Holes (interior rings) each must be a valid LinearRing, be completely
 *     inside the shell, not be nested inside other holes, not self-touch
 *     to create disconnected interiors, not be "C-shaped" with self-touching
 *     that creates islands
 * - MultiPolygon polygons must all be valid, no polygon can be in the interior
 *   of another polygon, shells cannot partially overlap or touch along an edge
 * - GeometryCollection geometries must all be valid
 * - Empty geometries are valid
 *
 * @param geometry - The geometry to check
 * @param options - Optional options object
 * @returns `true` when geometry is valid, `false` otherwise
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link isValidOrThrow} throws an error when geometry is not valid
 * @see {@link makeValid} repairs invalid geometries
 *
 * @example #live
 * const line = lineString([ [ 1, 1 ], [ 2, 2 ] ]);
 * const line_valid = isValid(line); // true
 *
 * const poly = polygon([ // self-touching exterior ring forming hole
 *     [ [ 0, 0 ], [ 0, 10 ], [ 10, 0 ], [ 0, 0 ], [ 4, 2 ], [ 2, 4 ], [ 0, 0 ] ],
 * ]);
 * const poly_valid1 = isValid(poly); // false
 * const poly_valid2 = isValid(poly, { isInvertedRingValid: true }); // true
 */
export function isValid(geometry: Geometry, options?: IsValidOptions): boolean {
    return Boolean(geos.GEOSisValidDetail(geometry[ POINTER ], +options?.isInvertedRingValid, 0 as Ptr<string[]>, 0 as Ptr<GEOSGeometry[]>));
}


/**
 * Asserts whether the geometry is valid.
 * Same as {@link isValid} but when geometry is not valid instead
 * of returning `false` throws an error with the reason of invalidity
 * and with the XY location of the point at which the error occurred.
 * When geometry is valid, it does nothing.
 *
 * @param geometry - The geometry to check
 * @param options - Optional options object
 * @throws {GEOSError} on unsupported geometry types (curved)
 * @throws {TopologyValidationError} on invalid geometry
 *
 * @see {@link isValid} checks whether a geometry is valid (`true`/`false`)
 * @see {@link makeValid} repairs invalid geometries
 *
 * @example
 * isValidOrThrow(lineString([ [ 0, 0 ], [ 1, 1 ] ])); // pass
 * const selfTouchingExteriorRingFormingHole = polygon([
 *     [ [ 0, 0 ], [ 0, 10 ], [ 10, 0 ], [ 0, 0 ], [ 4, 2 ], [ 2, 4 ], [ 0, 0 ] ],
 * ]);
 * isValidOrThrow(selfTouchingExteriorRingFormingHole, { isInvertedRingValid: true }); // pass
 * isValidOrThrow(selfTouchingExteriorRingFormingHole); // throw
 * // TopologyValidationError { message: 'Ring Self-intersection', location: [ 0, 0 ] }
 *
 * isValidOrThrow(polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 1 ], [ 0, 0 ] ] ])); // throw
 * // TopologyValidationError { message: 'Self-intersection', location: [ 0.5, 0.5 ] }
 */
export function isValidOrThrow(geometry: Geometry, options?: IsValidOptions): void {
    const r = geos.u1;
    const l = geos.u2;
    const isValid = geos.GEOSisValidDetail(geometry[ POINTER ], +options?.isInvertedRingValid, r[ POINTER ], l[ POINTER ]);
    if (!isValid) {
        const reasonPtr = r.get() as Ptr<string>;
        const reason = geos.decodeString(reasonPtr);
        const pt = new Geometry(l.get() as Ptr<GEOSGeometry>);
        const location = (jsonifyGeometry(pt) as GeoJSONPoint).coordinates;
        geos.free(reasonPtr);
        pt.free();
        throw new TopologyValidationError(reason, location);
    }
}
