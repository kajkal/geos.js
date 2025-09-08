import type { JSON_Feature, JSON_MultiCurve } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


export interface MultiCurve<P = unknown> extends GeometryRef<P> {

    readonly type: 'MultiCurve',

    toJSON(): JSON_Feature<JSON_MultiCurve, P>;

    clone(): MultiCurve<P>;

}
