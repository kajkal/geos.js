import type { JSON_CurvePolygon, JSON_Feature } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


export interface CurvePolygon<P = unknown> extends GeometryRef<P> {

    readonly type: 'CurvePolygon',

    toJSON(): JSON_Feature<JSON_CurvePolygon, P>;

    clone(): CurvePolygon<P>;

}
