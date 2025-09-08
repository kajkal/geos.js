import type { Feature as GeoJSON_Feature, FeatureCollection as GeoJSON_FeatureCollection, Geometry as GeoJSON_Geometry } from 'geojson';
import type { JSON_Feature, JSON_FeatureCollection, JSON_Geometry } from '../geom/types/JSON.mjs';
import { type CoordinateType, type Geometry, GeometryRef } from '../geom/Geometry.mjs';
import { geosifyFeatures, geosifyGeometry } from './geosify.mjs';
import { feature, jsonifyFeatures, jsonifyGeometry } from './jsonify.mjs';


export interface GeoJSONInputOptions {

    /**
     * Coordinate layout for interpreting GeoJSON coordinates.
     *
     * Defines how to interpret the coordinates of input geometries.
     * This does **not** force the dimension of the resulting geometries -
     * the actual geometry dimension will be determined from the parsed data.
     *
     * Use this to:
     * - Trim unwanted Z or M ordinates from the input.
     * - Treat the third ordinate as M instead of Z.
     *
     * @default 'XYZM'
     */
    layout?: CoordinateType;

}

/**
 * Creates a {@link Geometry} from GeoJSON representation.
 *
 * This function has 2 overloads, when called with:
 * - GeoJSON `Geometry` or GeoJSON `Feature` it returns a **single** geometry,
 * - GeoJSON `FeatureCollection` it returns an **array** of geometries.
 *
 * In addition to the 7 standard GeoJSON geometries, this reader also supports
 * JSON representation of other geometries supported by GEOS like
 * {@link JSON_CircularString}, {@link JSON_CompoundCurve} or {@link JSON_CurvePolygon}.
 *
 * Reader expects that all positions in an input geometry have the same number
 * of elements. The geometry coordinate dimension is determined from the first
 * encountered position.
 *
 * @template P - The type of geometry/feature properties
 * @param geojson - GeoJSON `Geometry`, `Feature` or `FeatureCollection`
 * @param options - Optional GeoJSON input configuration
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
 * @see {@link circularString} shortcut to create `CircularString` geometry
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
 *
 * @example #live 'layout' option
 * const json = { type: 'Point', coordinates: [ 1, 2, 3, 4 ] };
 *
 * const xyzm = toWKT(fromGeoJSON(json, { layout: 'XYZM' })); // 'POINT ZM (1 2 3 4)'
 * const xyz = toWKT(fromGeoJSON(json, { layout: 'XYZ' })); // 'POINT Z (1 2 3)'
 * const xym = toWKT(fromGeoJSON(json, { layout: 'XYM' })); // 'POINT M (1 2 3)'
 * const xy = toWKT(fromGeoJSON(json, { layout: 'XY' })); // 'POINT (1 2)'
 *
 * // 'layout' can only map or reduce the dimension it cannot increase it
 * const xyNOTxyz = toWKT(fromGeoJSON(
 *     { type: 'Point', coordinates: [ 1, 2 ] },
 *     { layout: 'XYZ' },
 * )); // 'POINT (1 2)'
 */
export function fromGeoJSON<P>(geojson: GeoJSON_Geometry | GeoJSON_Feature<GeoJSON_Geometry, P> | JSON_Geometry | JSON_Feature<JSON_Geometry, P>, options?: GeoJSONInputOptions): Geometry<P>;
export function fromGeoJSON<P>(geojson: GeoJSON_FeatureCollection<GeoJSON_Geometry, P> | JSON_FeatureCollection<JSON_Geometry, P>, options?: GeoJSONInputOptions): Geometry<P>[];
export function fromGeoJSON<P>(
    geojson: GeoJSON_Geometry | GeoJSON_Feature<GeoJSON_Geometry, P> | GeoJSON_FeatureCollection<GeoJSON_Geometry, P> | JSON_Geometry | JSON_Feature<JSON_Geometry, P> | JSON_FeatureCollection<JSON_Geometry, P>,
    options?: GeoJSONInputOptions,
): Geometry<P> | Geometry<P>[] {
    const layout = options?.layout;
    switch (geojson.type) {
        case 'FeatureCollection': {
            return geosifyFeatures(geojson.features, layout);
        }
        case 'Feature': {
            return geosifyGeometry(geojson.geometry, layout, geojson);
        }
    }
    return geosifyGeometry<P>(geojson, layout);
}


export interface GeoJSONOutputOptions {

    /**
     * Geometry types support mode.
     *
     * - `strict` mode: only allows the 7 standard GeoJSON geometry types:
     *   Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon,
     *   and GeometryCollection.
     *   When an input geometry is not one of these types, an error will be thrown.
     * - `extended` mode: allows serialization of all geometry types that GEOS
     *   supports, including curved geometries like CircularString, CompoundCurve,
     *   CurvePolygon, etc.
     *   The JSON structure of these geometries is not standardized and may change
     *   in future versions.
     *
     * @default 'strict'
     */
    flavor?: 'strict' | 'extended';

    /**
     * Coordinate layout for the output GeoJSON.
     *
     * Defines the coordinate structure of the output geometries.
     *
     * Use this to:
     * - Force 2D output by specifying 'XY'
     * - Drop M ordinates while keeping Z ordinates with 'XYZ'
     * - Drop Z ordinates while keeping M ordinates with 'XYM'
     * - Keep both Z and M ordinates with 'XYZM'
     *
     * ⚠️ **Warning:** M ordinates (measure values) are not part of the official
     * GeoJSON specification and may not be interpreted correctly by other parsers.
     * Use 'XY' or 'XYZ' layouts for maximum interoperability.
     *
     * @default 'XYZ'
     */
    layout?: CoordinateType;

}

export interface ExtendedGeoJSONOutputOptions extends GeoJSONOutputOptions {
    flavor: 'extended';
}

/**
 * Converts a geometry object to a GeoJSON `Feature` object or a GeoJSON
 * `FeatureCollection` object.
 *
 * This function has 2 overloads, when called with:
 * - a **single** geometry object it returns a GeoJSON `Feature` object,
 * - an **array** of geometry objects it returns a GeoJSON `FeatureCollection`
 *   object.
 *
 * @template P - The type of geometry/feature properties
 * @param geometryies - The geometry object or the array of geometry objects
 * to be converted into a GeoJSON object
 * @param options - Optional GeoJSON output configuration
 * @returns GeoJSON `Feature` or GeoJSON `FeatureCollection` object
 * @throws {GEOSError} (`strict` mode only) when called with not standard GeoJSON geometry
 *
 * @see {@link GeometryRef#toJSON} converts geometry to a GeoJSON `Feature` object
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const feature = toGeoJSON(a); // or `a.toJSON();`
 * // { type: 'Feature', geometry: {...}, properties: null }
 *
 * const b = point([ 1, 0 ]);
 * const featureCollection = toGeoJSON([ a, b ]);
 * // { type: 'FeatureCollection', features: [ {...}, {...} ] }
 *
 * @example #live 'flavor' option
 * const curvedGeometry = fromWKT('CIRCULARSTRING (10 20, 20 30, 30 20)');
 *
 * // by default only the standard GeoJSON geometries are supported:
 * // toGeoJSON(curvedGeometry); // this will throw
 *
 * const json = toGeoJSON(curvedGeometry, { flavor: 'extended' });
 * // { type: 'Feature', geometry: {...}, properties: null }
 *
 * @example 'layout' option
 * toGeoJSON(fromWKT('POINT ZM (1 2 3 4)'), { layout: 'XYZM' }); // will extract [ 1, 2, 3, 4 ]
 * toGeoJSON(fromWKT('POINT ZM (1 2 3 4)'), { layout: 'XYZ' }); // [ 1, 2, 3 ]
 * toGeoJSON(fromWKT('POINT ZM (1 2 3 4)'), { layout: 'XYM' }); // [ 1, 2, 4 ]
 * toGeoJSON(fromWKT('POINT ZM (1 2 3 4)'), { layout: 'XY' }); // [ 1, 2 ]
 * toGeoJSON(fromWKT('POINT M (1 2 4)'), { layout: 'XYZM' }); // [ 1, 2, NaN, 4 ]
 * toGeoJSON(fromWKT('POINT M (1 2 4)'), { layout: 'XYZ' }); // [ 1, 2 ]
 * toGeoJSON(fromWKT('POINT (1 2)'), { layout: 'XYZM' }); // [ 1, 2 ]
 * toGeoJSON(fromWKT('POINT (1 2)'), { layout: 'XYZ' }); // [ 1, 2 ]
 */
export function toGeoJSON<P>(geometryies: Geometry<P>, options: ExtendedGeoJSONOutputOptions): JSON_Feature<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P>, options?: GeoJSONOutputOptions): GeoJSON_Feature<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P>[], options: ExtendedGeoJSONOutputOptions): JSON_FeatureCollection<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P>[], options?: GeoJSONOutputOptions): GeoJSON_FeatureCollection<GeoJSON_Geometry, P>;
export function toGeoJSON<P>(geometryies: Geometry<P> | Geometry<P>[], options?: GeoJSONOutputOptions): GeoJSON_Feature<GeoJSON_Geometry, P> | GeoJSON_FeatureCollection<GeoJSON_Geometry, P> | JSON_Feature<JSON_Geometry, P> | JSON_FeatureCollection<JSON_Geometry, P> {
    const layout = options?.layout;
    const extended = options?.flavor === 'extended';
    if (Array.isArray(geometryies)) {
        return { type: 'FeatureCollection', features: jsonifyFeatures(geometryies, layout, extended) };
    }
    return feature(geometryies, jsonifyGeometry(geometryies, layout, extended));
}
