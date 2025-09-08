import type { JSON_CompoundCurve, JSON_Feature } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


export interface CompoundCurve<P = unknown> extends GeometryRef<P> {

    readonly type: 'CompoundCurve',

    toJSON(): JSON_Feature<JSON_CompoundCurve, P>;

    clone(): CompoundCurve<P>;

}
