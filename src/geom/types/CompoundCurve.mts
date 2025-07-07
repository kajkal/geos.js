import { GeometryRef } from '../Geometry.mjs';


export interface CompoundCurve<P = unknown> extends GeometryRef<P> {

    readonly type: 'CompoundCurve',

    toJSON(): never;

    clone(): CompoundCurve<P>;

}
