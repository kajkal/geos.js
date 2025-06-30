import { Geometry } from '../Geometry.mjs';


export interface LinearRing<P = unknown> extends Geometry<P> {

    readonly type: 'LinearRing';

    toJSON(): never;

    clone(): LinearRing<P>;

}
