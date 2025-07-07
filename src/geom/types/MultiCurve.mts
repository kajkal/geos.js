import { GeometryRef } from '../Geometry.mjs';


export interface MultiCurve<P = unknown> extends GeometryRef<P> {

    readonly type: 'MultiCurve',

    toJSON(): never;

    clone(): MultiCurve<P>;

}
