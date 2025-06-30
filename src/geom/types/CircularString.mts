import { Geometry } from '../Geometry.mjs';


export interface CircularString<P = unknown> extends Geometry<P> {

    readonly type: 'CircularString',

    toJSON(): never;

    clone(): CircularString<P>;

}
