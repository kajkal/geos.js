import type { Feature as GeoJSON_Feature, Polygon as GeoJSON_Polygon } from 'geojson';
import { Geometry } from '../Geometry.mjs';


/**
 * Polygon is an instance of {@link Geometry} that represents the polygon geometry.
 *
 * @see {@link polygon} creates a polygon geometry from an array of linear rings coordinates
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'Polygon',
 *     coordinates: [
 *         [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ],
 *     ],
 * });
 * const b = polygon([ // shortcut to above
 *     [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ],
 * ]);
 * const c = fromWKT('POLYGON ((0 0, 0 1, 1 0, 0 0))');
 * const d = polygon([
 *     [ [ 0, 0 ], [ 0, 8 ], [ 8, 0 ], [ 0, 0 ] ], // shell
 *     [ [ 2, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ], // hole 1
 *     [ [ 2, 2 ], [ 2, 3 ], [ 3, 2 ], [ 2, 2 ] ], // hole 2
 * ]);
 */
export interface Polygon<P = unknown> extends Geometry<P> {

    readonly type: 'Polygon';

    toJSON(): GeoJSON_Feature<GeoJSON_Polygon, P>;

    clone(): Polygon<P>;

}
