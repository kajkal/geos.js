import type { JSON_CircularString, JSON_Feature } from './JSON.mjs';
import { GeometryRef } from '../Geometry.mjs';


export interface CircularString<P = unknown> extends GeometryRef<P> {

    readonly type: 'CircularString',

    toJSON(): JSON_Feature<JSON_CircularString, P>;

    clone(): CircularString<P>;

}
