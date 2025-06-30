import { Geometry } from '../Geometry.mjs';


export interface CompoundCurve<P = unknown> extends Geometry<P> {

    readonly type: 'CompoundCurve',

    toJSON(): never;

    clone(): CompoundCurve<P>;

}
