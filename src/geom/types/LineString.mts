import type { Feature as GeoJSON_Feature, LineString as GeoJSON_LineString } from 'geojson';
import { GeometryRef } from '../Geometry.mjs';


/**
 * LineString is an instance of {@link GeometryRef} that represents the line string geometry.
 *
 * @see {@link lineString} creates a line string geometry from an array of positions
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'LineString',
 *     coordinates: [ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ],
 * });
 * const b = lineString([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ]); // shortcut to above
 * const c = fromWKT('LINESTRING (0 0, 1 1, 2 2)');
 */
export interface LineString<P = unknown> extends GeometryRef<P> {

    readonly type: 'LineString';

    toJSON(): GeoJSON_Feature<GeoJSON_LineString, P>;

    clone(): LineString<P>;

}
