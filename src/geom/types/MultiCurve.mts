import { Geometry } from '../Geometry.mjs';


export interface MultiCurve<P = unknown> extends Geometry<P> {

    readonly type: 'MultiCurve',

    toJSON(): never;

    clone(): MultiCurve<P>;

}
