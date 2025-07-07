import { GeometryRef } from '../Geometry.mjs';


export interface CurvePolygon<P = unknown> extends GeometryRef<P> {

    readonly type: 'CurvePolygon',

    toJSON(): never;

    clone(): CurvePolygon<P>;

}
