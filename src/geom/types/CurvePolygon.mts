import { Geometry } from '../Geometry.mjs';


export interface CurvePolygon<P = unknown> extends Geometry<P> {

    readonly type: 'CurvePolygon',

    toJSON(): never;

    clone(): CurvePolygon<P>;

}
