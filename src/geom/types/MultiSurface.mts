import { Geometry } from '../Geometry.mjs';


export interface MultiSurface<P = unknown> extends Geometry<P> {

    readonly type: 'MultiSurface',

    toJSON(): never;

    clone(): MultiSurface<P>;

}
