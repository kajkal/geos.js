import { GeometryRef } from '../Geometry.mjs';


export interface MultiSurface<P = unknown> extends GeometryRef<P> {

    readonly type: 'MultiSurface',

    toJSON(): never;

    clone(): MultiSurface<P>;

}
