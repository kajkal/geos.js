import type { Feature as GeoJSON_Feature, Point as GeoJSON_Point } from 'geojson';
import { GeometryRef } from '../Geometry.mjs';


/**
 * Point is an instance of {@link GeometryRef} that represents the point geometry.
 *
 * @see {@link point} creates a point geometry from a single coordinate
 *
 * @example
 * const a = fromGeoJSON({ type: 'Point', coordinates: [ 0, 0 ] });
 * const b = point([ 0, 0 ]); // shortcut to above
 * const c = fromWKT('POINT (0 0)');
 */
export interface Point<P = unknown> extends GeometryRef<P> {

    readonly type: 'Point';

    toJSON(): GeoJSON_Feature<GeoJSON_Point, P>;

    clone(): Point<P>;

}
