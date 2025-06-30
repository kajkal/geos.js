import type { Feature as GeoJSON_Feature, MultiLineString as GeoJSON_MultiLineString } from 'geojson';
import { Geometry } from '../Geometry.mjs';


/**
 * MultiLineString is an instance of {@link Geometry} that represents the multi line string geometry.
 *
 * @see {@link multiLineString} creates a multi line string geometry from an array of line strings coordinates
 *
 * @example
 * const a = fromGeoJSON({
 *     type: 'MultiLineString',
 *     coordinates: [
 *         [ [ 0, 0 ], [ 1, 1 ] ], // line 1
 *         [ [ 2, 2 ], [ 3, 3 ] ], // line 2
 *     ],
 * });
 * const b = multiLineString([ // shortcut to above
 *     [ [ 0, 0 ], [ 1, 1 ] ],
 *     [ [ 2, 2 ], [ 3, 3 ] ],
 * ]);
 * const c = fromWKT('MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');
 */
export interface MultiLineString<P = unknown> extends Geometry<P> {

    readonly type: 'MultiLineString';

    toJSON(): GeoJSON_Feature<GeoJSON_MultiLineString, P>;

    clone(): MultiLineString<P>;

}
