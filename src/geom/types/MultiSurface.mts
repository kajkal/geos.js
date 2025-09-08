import type { JSON_Feature, JSON_MultiSurface } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


export interface MultiSurface<P = unknown> extends GeometryRef<P> {

    readonly type: 'MultiSurface',

    toJSON(): JSON_Feature<JSON_MultiSurface, P>;

    clone(): MultiSurface<P>;

}
