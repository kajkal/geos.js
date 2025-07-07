import { GeometryRef } from '../Geometry.mjs';


export interface CircularString<P = unknown> extends GeometryRef<P> {

    readonly type: 'CircularString',

    toJSON(): never;

    clone(): CircularString<P>;

}
