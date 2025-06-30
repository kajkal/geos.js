import type { Feature as GeoJSON_Feature, MultiPolygon as GeoJSON_MultiPolygon } from 'geojson';
import { Geometry } from '../Geometry.mjs';


/**
 * MultiPolygon is an instance of {@link Geometry} that represents the multi polygon geometry.
 *
 * @see {@link multiPolygon} creates a multi polygon geometry from an array of polygon coordinates
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'MultiPolygon',
 *     coordinates: [
 *         [ [ [ 0, 1 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ] ] ], // polygon 1
 *         [ [ [ 1, 1 ], [ 1, 3 ], [ 3, 1 ], [ 1, 1 ] ] ], // polygon 2
 *     ],
 * });
 * const b = multiPolygon([ // shortcut to above
 *     [ [ [ 0, 1 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ] ] ],
 *     [ [ [ 1, 1 ], [ 1, 3 ], [ 3, 1 ], [ 1, 1 ] ] ],
 * ]);
 * const c = fromWKT('MULTIPOLYGON (((0 1, 1 0, 1 1, 0 1)), ((1 1, 1 3, 3 1, 1 1)))');
 */
export interface MultiPolygon<P = unknown> extends Geometry<P> {

    readonly type: 'MultiPolygon';

    toJSON(): GeoJSON_Feature<GeoJSON_MultiPolygon, P>;

    clone(): MultiPolygon<P>;

}
