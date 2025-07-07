import { GeometryRef } from '../Geometry.mjs';


export interface LinearRing<P = unknown> extends GeometryRef<P> {

    readonly type: 'LinearRing';

    toJSON(): never;

    clone(): LinearRing<P>;

}
