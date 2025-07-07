import type { Feature as GeoJSON_Feature, MultiPoint as GeoJSON_MultiPoint } from 'geojson';
import { GeometryRef } from '../Geometry.mjs';


/**
 * MultiPoint is an instance of {@link GeometryRef} that represents the multi point geometry.
 *
 * @see {@link multiPoint} creates a multi point geometry from an array of positions
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'MultiPoint',
 *     coordinates: [ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ],
 * });
 * const b = multiPoint([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ]); // shortcut to above
 * const c = fromWKT('MULTIPOINT (0 0, 1 1, 2 2)');
 */
export interface MultiPoint<P = unknown> extends GeometryRef<P> {

    readonly type: 'MultiPoint';

    toJSON(): GeoJSON_Feature<GeoJSON_MultiPoint, P>;

    clone(): MultiPoint<P>;

}
