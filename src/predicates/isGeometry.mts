import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';


/**
 * Checks whether a `value` is a [geometry]{@link Geometry} object created
 * by the `geos.js`.
 *
 * @param value - The value to check
 * @returns `true` if value is a geometry object created by the `geos.js`
 *
 * @example #live
 * const t1 = isGeometry(fromWKT('POINT EMPTY')); // true
 * const t2 = isGeometry(point([ 0, 0 ])); // true
 *
 * const f1 = isGeometry('POINT (0 0)'); // false
 * const f2 = isGeometry({ type: 'Point', coordinates: [ 0, 0 ] }); // false
 */
export function isGeometry(value: unknown): value is Geometry {
    return value instanceof GeometryRef;
}
