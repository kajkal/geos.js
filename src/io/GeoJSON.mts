import type { Feature as GeoJSON_Feature, FeatureCollection as GeoJSON_FeatureCollection, Geometry as GeoJSON_Geometry } from 'geojson';
import { Geometry } from '../geom/Geometry.mjs';
import { geosifyFeatures, geosifyGeometry } from './geosify.mjs';
import { jsonifyFeatures } from './jsonify.mjs';


/**
 * Creates a {@link Geometry} from GeoJSON representation.
 *
 * This function has 2 overloads, when called with:
 * - GeoJSON `Geometry` or GeoJSON `Feature` it returns a **single** geometry,
 * - GeoJSON `FeatureCollection` it returns an **array** of geometries.
 *
 * GeoJSON `Feature` properties are saved in the [`props`]{@link Geometry#props}
 * field of the created geometry object.
 *
 * Loading multiple geometries from a single `FeatureCollection` is faster
 * than loading each geometry individually because it processes the data in bulk.
 *
 * @template P - The type of geometry/feature properties
 * @param geojson - GeoJSON `Geometry`, `Feature` or `FeatureCollection`
 * @returns A new geometry object or an array of new geometry objects
 * @throws {InvalidGeoJSONError} on GeoJSON feature without geometry
 * @throws {InvalidGeoJSONError} on invalid GeoJSON geometry
 *
 * @see {@link point} shortcut to create `Point` geometry
 * @see {@link lineString} shortcut to create `LineString` geometry
 * @see {@link polygon} shortcut to create `Polygon` geometry
 * @see {@link multiPoint} shortcut to create `MultiPoint` geometry
 * @see {@link multiLineString} shortcut to create `MultiLineString` geometry
 * @see {@link multiPolygon} shortcut to create `MultiPolygon` geometry
 *
 * @example #live
 * const a = fromGeoJSON({
 *     type: 'Point',
 *     coordinates: [ 0, 0 ],
 * });
 * const b = fromGeoJSON({
 *     type: 'Feature',
 *     geometry: { type: 'Point', coordinates: [ 1, 0, 10 ] },
 *     properties: { name: 'B' },
 * });
 * const [ c ] = fromGeoJSON({
 *     type: 'FeatureCollection',
 *     features: [ {
 *         type: 'Feature',
 *         geometry: { type: 'Point', coordinates: [ 2, 0 ] },
 *         properties: { name: 'C' },
 *     } ],
 * });
 *
 * const c_properties = a.props; // undefined
 * const b_properties = b.props; // { name: 'B' }
 * const a_properties = c.props; // { name: 'C' }
 */
export function fromGeoJSON<P>(geojson: GeoJSON_Geometry | GeoJSON_Feature<GeoJSON_Geometry, P>): Geometry<P>;
export function fromGeoJSON<P>(geojson: GeoJSON_FeatureCollection<GeoJSON_Geometry, P>): Geometry<P>[];
export function fromGeoJSON<P>(geojson: GeoJSON_Geometry | GeoJSON_Feature<GeoJSON_Geometry, P> | GeoJSON_FeatureCollection<GeoJSON_Geometry, P>): Geometry<P> | Geometry<P>[] {
    switch (geojson.type) {
        case 'FeatureCollection': {
            return geosifyFeatures(geojson.features);
        }
        case 'Feature': {
            return geosifyGeometry(geojson.geometry, geojson);
        }
    }
    return geosifyGeometry<P>(geojson);
}


/**
 * Converts the geometry to a GeoJSON `Feature` object or a GeoJSON
 * `FeatureCollection` object.
 *
 * This function has 2 overloads, when called with:
 * - a **single** geometry object it returns a GeoJSON `Feature` object,
 * - an **array** of geometry objects it returns a GeoJSON `FeatureCollection`
 *   object.
 *
 * Converting multiple geometries into a single `FeatureCollection` is faster
 * than converting each geometry into `Feature` individually because it
 * processes the data in bulk.
 *
 * @template P - The type of geometry/feature properties
 * @param geometryies - The geometry object or the array of geometry objects
 * to be converted into a GeoJSON object
 * @returns GeoJSON `Feature` or GeoJSON `FeatureCollection` object
 * @throws {GEOSError} when called with an unsupported geometry type (not GeoJSON)
 *
 * @see {@link Geometry#toJSON} converts geometry to a GeoJSON `Feature` object
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const feature = toGeoJSON(a); // or `a.toJSON();`
 * // { type: 'Feature', geometry: {...}, properties: null }
 *
 * const b = point([ 1, 0 ]);
 * const featureCollection = toGeoJSON([ a, b ]);
 * // { type: 'FeatureCollection', features: [ {...}, {...} ] }
 */
export function toGeoJSON<P>(geometryies: Geometry<P>): GeoJSON_Feature<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P>[]): GeoJSON_FeatureCollection<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P> | Geometry<P>[]): GeoJSON_Feature<GeoJSON_Geometry, P> | GeoJSON_FeatureCollection<GeoJSON_Geometry, P> {
    if (Array.isArray(geometryies)) {
        return { type: 'FeatureCollection', features: jsonifyFeatures(geometryies) };
    }
    return geometryies.toJSON();
}
