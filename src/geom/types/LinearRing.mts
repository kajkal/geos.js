import type { Feature as GeoJSON_Feature, LineString as GeoJSON_LineString } from 'geojson';
import { GeometryRef } from '../Geometry.mjs';


export interface LinearRing<P = unknown> extends GeometryRef<P> {

    readonly type: 'LinearRing';

    toJSON(): GeoJSON_Feature<GeoJSON_LineString, P>;

    clone(): LinearRing<P>;

}
