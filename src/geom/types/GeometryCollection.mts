import type { JSON_Feature, JSON_GeometryCollection } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


/**
 * GeometryCollection is an instance of {@link GeometryRef} that represents the geometry collection.
 *
 * @see {@link geometryCollection} creates a geometry collection from an array of geometries
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'GeometryCollection',
 *     geometries: [
 *         { type: 'Point', coordinates: [ 0, 0 ] },
 *         { type: 'LineString', coordinates: [ [ 0, 1 ], [ 1, 0 ] ] },
 *     ],
 * });
 * const b = geometryCollection([
 *     point([ 0, 0 ]),
 *     lineString([ [ 0, 1 ], [ 1, 0 ] ]),
 * ]);
 */
export interface GeometryCollection<P = unknown> extends GeometryRef<P> {

    readonly type: 'GeometryCollection';

    toJSON(): JSON_Feature<JSON_GeometryCollection, P>;

    clone(): GeometryCollection<P>;

}
