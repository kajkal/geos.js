import type { LineString as GeoJSON_LineString, MultiLineString as GeoJSON_MultiLineString, MultiPoint as GeoJSON_MultiPoint, MultiPolygon as GeoJSON_MultiPolygon, Point as GeoJSON_Point, Polygon as GeoJSON_Polygon, Position } from 'geojson';


/**
 * Similar to the [GeoJSON_GeometryCollection]{@link https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.8}
 * but allows for more geometry types.
 *
 * @template G - The type of JSON geometry
 */
export interface JSON_GeometryCollection<G extends JSON_Geometry = JSON_Geometry> {
    type: 'GeometryCollection';
    geometries: G[];
}

export interface JSON_CircularString {
    type: 'CircularString';
    coordinates: Position[];
}

export interface JSON_CompoundCurve {
    type: 'CompoundCurve';
    segments: (GeoJSON_LineString | JSON_CircularString)[];
}

export interface JSON_CurvePolygon {
    type: 'CurvePolygon';
    rings: (GeoJSON_LineString | JSON_CircularString | JSON_CompoundCurve)[];
}

export interface JSON_MultiCurve {
    type: 'MultiCurve';
    curves: (GeoJSON_LineString | JSON_CircularString | JSON_CompoundCurve)[];
}

export interface JSON_MultiSurface {
    type: 'MultiSurface';
    surfaces: (GeoJSON_Polygon | JSON_CurvePolygon)[];
}


/**
 * Union type of JSON representation of all geometry types supported by GEOS.
 */
export type JSON_Geometry =
    GeoJSON_Point |
    GeoJSON_LineString |
    GeoJSON_Polygon |
    GeoJSON_MultiPoint |
    GeoJSON_MultiLineString |
    GeoJSON_MultiPolygon |
    JSON_GeometryCollection |
    JSON_CircularString |
    JSON_CompoundCurve |
    JSON_CurvePolygon |
    JSON_MultiCurve |
    JSON_MultiSurface


/**
 * Similar to the [GeoJSON_Feature]{@link https://datatracker.ietf.org/doc/html/rfc7946#section-3.2}
 * but allows for more geometry types.
 *
 * @template G - The type of JSON geometry
 */
export interface JSON_Feature<G extends JSON_Geometry | null = JSON_Geometry, P = any> {
    type: 'Feature';
    geometry: G;
    id?: string | number | undefined;
    properties: P;
}


/**
 * Similar to the [GeoJSON_FeatureCollection]{@link https://datatracker.ietf.org/doc/html/rfc7946#section-3.3}
 * but allows for more geometry types.
 *
 * @template G - The type of JSON geometry
 */
export interface JSON_FeatureCollection<G extends JSON_Geometry | null = JSON_Geometry, P = any> {
    type: 'FeatureCollection';
    features: JSON_Feature<G, P>[];
}
