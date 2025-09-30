import type { LineString as GeoJSON_LineString, Position } from 'geojson';
import type { JSON_CircularString, JSON_CompoundCurve, JSON_Geometry } from 'geos.js';
import { BBox, Projection } from '@site/src/components/Preview/renderer/utils';


export interface RenderWarning {
    message: string;
    details?: string;
}

interface Point {
    dim: 0;
    path: Path2D;
    x: number;
    y: number;
}

interface Curve {
    dim: 1;
    path: Path2D;
    bbox: BBox;
}

interface Surface {
    dim: 2;
    path: Path2D;
    bbox: BBox;
}

export type Shape = Point | Curve | Surface;


export class ShapeBuilder {

    proj!: Projection;
    warnings: RenderWarning[] = [];
    shapes: Shape[] = [];


    private appendLinearCurve(ctx: Path2D, bbox: BBox, pts: Position[], move?: boolean, ring?: boolean): void {
        let ptsLength = pts.length;
        if (ptsLength) {
            const { xs, ys } = this.proj.forwardArray(pts, bbox);
            let isClosed: boolean | undefined;
            if (ring) {
                const firstPt = pts[ 0 ], lastPt = pts[ ptsLength - 1 ];
                isClosed = firstPt[ 0 ] === lastPt[ 0 ] && firstPt[ 1 ] === lastPt[ 1 ];
                if (isClosed) {
                    ptsLength--;
                } else {
                    this.warnings.push({
                        message: 'Polygon ring must be closed',
                        details: `Points [ ${firstPt.join(', ')} ] and [ ${lastPt.join(', ')} ] are not equal`,
                    });
                }
            }

            if (move) {
                ctx.moveTo(xs[ 0 ], ys[ 0 ]);
            }

            for (let i = 1; i < ptsLength; i++) {
                ctx.lineTo(xs[ i ], ys[ i ]);
            }

            if (isClosed) {
                ctx.closePath();
            }
        }
    }

    private appendCircularCurve(ctx: Path2D, bbox: BBox, pts: Position[], move?: boolean, ring?: boolean): void {
        const ptsLength = pts.length;
        if (ptsLength) {
            if (ptsLength < 3) {
                this.warnings.push({ message: 'CircularString must have at least one circular arc defined by 3 points' });
            } else if (!(ptsLength % 2)) {
                this.warnings.push({ message: 'CircularString must have and odd number of points' });
            }

            const { xs, ys } = this.proj.forwardArray(pts, bbox);
            let isClosed = false;
            if (ring) {
                const firstPt = pts[ 0 ], lastPt = pts[ ptsLength - 1 ];
                isClosed = firstPt[ 0 ] === lastPt[ 0 ] && firstPt[ 1 ] === lastPt[ 1 ];
                if (!isClosed) {
                    this.warnings.push({
                        message: 'Polygon circular ring must be closed',
                        details: `Points [ ${firstPt.join(', ')} ] and [ ${lastPt.join(', ')} ] are not equal`,
                    });
                }
            }

            if (move) {
                ctx.moveTo(xs[ 0 ], ys[ 0 ]);
            }

            const TAU = 2 * Math.PI;
            let i = 0;
            for (; i <= ptsLength - 3;) {
                const x1 = xs[ i ], y1 = ys[ i++ ];
                const x2 = xs[ i ], y2 = ys[ i++ ];
                const x3 = xs[ i ], y3 = ys[ i ];
                if (x1 === x3 && y1 === y3) {
                    // not sure if this should be allowed or not
                    const arc = `[ [ ${pts[ i - 2 ].join(', ')} ], [ ${pts[ i - 1 ].join(', ')} ], [ ${pts[ i ].join(', ')} ] ]`;
                    this.warnings.push({
                        message: 'Closed circular arc',
                        details: `Define a circle using two arcs for maximum interoperability with other tools\nArc: ${arc}`,
                    });

                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;
                    const r = Math.hypot(x2 - x1, y2 - y1) / 2;
                    const a1 = Math.atan2(y1 - cy, x1 - cx);
                    ctx.arc(cx, cy, r, a1, a1 + TAU);
                    bbox.addXY(cx - r, cy - r);
                    bbox.addXY(cx + r, cy + r);
                    continue;
                }

                const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
                if (Math.abs(d) < 1e-8) {
                    // not sure if this should be allowed or not (or if there should be warning about that)
                    const arc = `[ [ ${pts[ i - 2 ].join(', ')} ], [ ${pts[ i - 1 ].join(', ')} ], [ ${pts[ i ].join(', ')} ] ]`;
                    this.warnings.push({
                        message: 'Circular arc points are collinear', // (or close to be)
                        details: `Arc: ${arc}`,
                    });

                    // use two L commands to handle arcs like: (4 0, 2 0, 6 0)
                    ctx.lineTo(x2, y2);
                    ctx.lineTo(x3, y3);
                    continue;
                }

                const s1 = x1 * x1 + y1 * y1;
                const s2 = x2 * x2 + y2 * y2;
                const s3 = x3 * x3 + y3 * y3;
                const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / d;
                const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / d;
                const r = Math.hypot(cx - x1, cy - y1);
                if (!isFinite(r)) {
                    const arc = `[ [ ${pts[ i - 2 ].join(', ')} ], [ ${pts[ i - 1 ].join(', ')} ], [ ${pts[ i ].join(', ')} ] ]`;
                    this.warnings.push({
                        message: 'Cannot render circular arc, radius is too big',
                        details: `Arc: ${arc}`,
                    });
                    ctx.lineTo(x2, y2);
                    ctx.lineTo(x3, y3);
                    continue;
                }

                const cw = ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) > 0 ? 1 : 0;
                const a1 = Math.atan2(y1 - cy, x1 - cx);
                const a3 = Math.atan2(y3 - cy, x3 - cx);
                ctx.arc(cx, cy, r, a1, a3, !cw);
                bbox.addArc(cx, cy, r, a1, a3, !cw);
            }
            for (i++; i < ptsLength; i++) {
                ctx.lineTo(xs[ i ], ys[ i ]);
            }

            if (isClosed) {
                ctx.closePath();
            }
        }
    }

    private appendCompoundCurve(ctx: Path2D, bbox: BBox, segments: (GeoJSON_LineString | JSON_CircularString)[], ring?: boolean): void {
        if (segments.length) {
            let firstPt: Position | undefined; // first pt in general
            let lastPt: Position | undefined; // last pt from last segment

            for (const { type, coordinates: pts } of segments) {
                if (!pts.length) continue;

                let move: boolean | undefined;
                if (!lastPt) {
                    move = true;
                    firstPt = pts[ 0 ];
                } else if (lastPt[ 0 ] !== pts[ 0 ][ 0 ] && lastPt[ 1 ] !== pts[ 0 ][ 1 ]) {
                    move = true;
                    this.warnings.push({
                        message: 'CircularString segments must be continuous',
                        details: `Points [ ${lastPt.join(', ')} ] and [ ${pts[ 0 ].join(', ')} ] are not equal`,
                    });
                }
                lastPt = pts[ pts.length - 1 ];

                if (type === 'CircularString') {
                    this.appendCircularCurve(ctx, bbox, pts, move);
                } else {
                    this.appendLinearCurve(ctx, bbox, pts, move);
                }
            }

            if (ring && firstPt && lastPt) {
                const isClosed = firstPt[ 0 ] === lastPt[ 0 ] && firstPt[ 1 ] === lastPt[ 1 ];
                if (isClosed) {
                    ctx.closePath();
                }
            }
        }
    }


    private point(x: number, y: number): Point {
        return { dim: 0, path: null!, x, y };
    }

    private curve(ctx: Path2D, bbox: BBox): Curve {
        return { dim: 1, path: ctx, bbox };
    }

    private surface(ctx: Path2D, bbox: BBox): Surface {
        return { dim: 2, path: ctx, bbox };
    }


    private withPoint(pt: Position): void {
        const [ x, y ] = this.proj.forward(pt);
        this.shapes.push(this.point(x, y));
    }

    private withLineString(pts: Position[]): void {
        const ctx = new Path2D(), bbox = new BBox();
        this.appendLinearCurve(ctx, bbox, pts, true);
        this.shapes.push(this.curve(ctx, bbox));
    }

    private withCircularString(pts: Position[]): void {
        const ctx = new Path2D(), bbox = new BBox();
        this.appendCircularCurve(ctx, bbox, pts, true);
        this.shapes.push(this.curve(ctx, bbox));
    }

    private withCompoundCurve(segments: (GeoJSON_LineString | JSON_CircularString)[]): void {
        const ctx = new Path2D(), bbox = new BBox();
        this.appendCompoundCurve(ctx, bbox, segments);
        this.shapes.push(this.curve(ctx, bbox));
    }

    private withPolygon(ppts: Position[][]): void {
        const ctx = new Path2D(), bbox = new BBox();
        for (const ppt of ppts) {
            this.appendLinearCurve(ctx, bbox, ppt, true, true);
        }
        this.shapes.push(this.surface(ctx, bbox));
    }

    private withCurvePolygon(rings: (GeoJSON_LineString | JSON_CircularString | JSON_CompoundCurve)[]): void {
        const ctx = new Path2D(), bbox = new BBox();
        for (const ring of rings) {
            if (ring.type === 'CompoundCurve') {
                this.appendCompoundCurve(ctx, bbox, ring.segments, true);
            } else if (ring.type === 'CircularString') {
                this.appendCircularCurve(ctx, bbox, ring.coordinates, true, true);
            } else {
                this.appendLinearCurve(ctx, bbox, ring.coordinates, true, true);
            }
        }
        this.shapes.push(this.surface(ctx, bbox));
    }

    private withGeometry(geom: JSON_Geometry): void {
        switch (geom.type) {

            // points
            case 'Point': {
                const pt = geom.coordinates;
                if (pt.length) {
                    this.withPoint(pt);
                }
                return;
            }
            case 'MultiPoint' : {
                for (const pt of geom.coordinates) {
                    this.withPoint(pt);
                }
                return;
            }

            // curves
            case 'LineString': {
                this.withLineString(geom.coordinates);
                return;
            }
            case 'MultiLineString': {
                for (const pts of geom.coordinates) {
                    this.withLineString(pts);
                }
                return;
            }
            case 'CircularString': {
                this.withCircularString(geom.coordinates);
                return;
            }
            case 'CompoundCurve': {
                this.withCompoundCurve(geom.segments);
                return;
            }
            case 'MultiCurve': {
                for (const curve of geom.curves) {
                    this.withGeometry(curve);
                }
                return;
            }

            // surfaces
            case 'Polygon': {
                this.withPolygon(geom.coordinates);
                return;
            }
            case 'MultiPolygon': {
                for (const ppts of geom.coordinates) {
                    this.withPolygon(ppts);
                }
                return;
            }
            case 'CurvePolygon': {
                this.withCurvePolygon(geom.rings);
                return;
            }
            case 'MultiSurface': {
                for (const surface of geom.surfaces) {
                    this.withGeometry(surface);
                }
                return;
            }

            // mixed collection
            case 'GeometryCollection': {
                for (const geometry of geom.geometries) {
                    this.withGeometry(geometry);
                }
                return;
            }

        }
        throw new Error(`Invalid geometry ${JSON.stringify(geom)}`);
    }


    static build(json: JSON_Geometry, proj: Projection): Pick<ShapeBuilder, 'shapes' | 'warnings'> {
        const builder = new ShapeBuilder();
        builder.proj = proj;
        builder.withGeometry(json);
        return builder;
    }

}


export type VertexType =
    undefined | // missing for standalone points (parts of Point/MultiPoint)
    1 | // normal vertex
    2 | // ring starting point
    3;  // arc middle point

export interface Vertex {
    p: Position; // original position (not projected)
    t?: VertexType;
}

export interface VertexIndicator {
    x: number; // vertex projected position
    y: number;
    t: Exclude<VertexType, undefined>;
}

export class VertexVisitor {

    vertices: Vertex[] = [];

    private visitPoint(pt: Position): void {
        this.vertices.push({ p: pt });
    }

    private visitCurve(pts: Position[], circular: boolean): void {
        if (pts.length) {
            let firstPtIdx = this.vertices.length, i = 0;

            if (circular) {
                while (i <= pts.length - 3) {
                    this.vertices.push({ p: pts[ i++ ], t: 1 });
                    this.vertices.push({ p: pts[ i++ ], t: 3 });
                }
            } else {
                while (i < pts.length - 1) {
                    this.vertices.push({ p: pts[ i++ ], t: 1 });
                }
            }

            const firstPt = pts[ 0 ], lastPt = pts[ i ];
            const isClosed = firstPt[ 0 ] === lastPt[ 0 ] && firstPt[ 1 ] === lastPt[ 1 ];
            if (isClosed) {
                this.vertices[ firstPtIdx ].t = 2;
            } else {
                this.vertices.push({ p: pts[ i ], t: 1 });
            }
        }
    }

    private visitCompoundCurve(segments: (GeoJSON_LineString | JSON_CircularString)[]): void {
        if (segments.length) {
            let firstPtIdx = this.vertices.length;
            let firstPt: Position | undefined;
            let lastPt: Position | undefined;

            for (const { type, coordinates: pts } of segments) {
                if (!pts.length) continue;

                if (!lastPt) {
                    firstPt = pts[ 0 ];
                } else if (lastPt[ 0 ] !== pts[ 0 ][ 0 ] && lastPt[ 1 ] !== pts[ 0 ][ 1 ]) {
                    this.vertices.push({ p: lastPt, t: 1 });
                }

                let i = 0;
                if (type === 'CircularString') {
                    while (i <= pts.length - 3) {
                        this.vertices.push({ p: pts[ i++ ], t: 1 });
                        this.vertices.push({ p: pts[ i++ ], t: 3 });
                    }
                } else {
                    while (i < pts.length - 1) {
                        this.vertices.push({ p: pts[ i++ ], t: 1 });
                    }
                }
                lastPt = pts[ i ];
            }

            if (firstPt && lastPt) {
                const isClosed = firstPt[ 0 ] === lastPt[ 0 ] && firstPt[ 1 ] === lastPt[ 1 ];
                if (isClosed) {
                    this.vertices[ firstPtIdx ].t = 2;
                } else {
                    this.vertices.push({ p: lastPt, t: 1 });
                }
            }
        }
    }

    private visitGeometry(geom: JSON_Geometry): void {
        switch (geom.type) {

            // points
            case 'Point': {
                this.visitPoint(geom.coordinates);
                return;
            }
            case 'MultiPoint' : {
                for (const pt of geom.coordinates) {
                    this.visitPoint(pt);
                }
                return;
            }

            // curves
            case 'LineString': {
                this.visitCurve(geom.coordinates, false);
                return;
            }
            case 'MultiLineString': {
                for (const pts of geom.coordinates) {
                    this.visitCurve(pts, false);
                }
                return;
            }
            case 'CircularString': {
                this.visitCurve(geom.coordinates, true);
                return;
            }
            case 'CompoundCurve': {
                this.visitCompoundCurve(geom.segments);
                return;
            }
            case 'MultiCurve': {
                for (const sub of geom.curves) {
                    this.visitGeometry(sub);
                }
                return;
            }

            // surfaces
            case 'Polygon': {
                const ppts = geom.coordinates;
                for (const pts of ppts) {
                    this.visitCurve(pts, false);
                }
                return;
            }
            case 'MultiPolygon': {
                for (const ppts of geom.coordinates) {
                    for (const pts of ppts) {
                        this.visitCurve(pts, false);
                    }
                }
                return;
            }
            case 'CurvePolygon': {
                for (const sub of geom.rings) {
                    this.visitGeometry(sub);
                }
                return;
            }
            case 'MultiSurface': {
                for (const surface of geom.surfaces) {
                    this.visitGeometry(surface);
                }
                return;
            }

            // mixed collection
            case 'GeometryCollection': {
                for (const geometry of geom.geometries) {
                    this.visitGeometry(geometry);
                }
                return;
            }

        }
    }


    static getVertices(geom: JSON_Geometry): Vertex[] {
        const visitor = new VertexVisitor();
        visitor.visitGeometry(geom);
        return visitor.vertices;
    }

    static getIndicators(geom: JSON_Geometry, proj: Projection): VertexIndicator[] {
        const visitor = new VertexVisitor();
        visitor.visitGeometry(geom);
        return visitor.vertices
            .filter(p => p.t) // ignore (Multi)Point
            .map(p => {
                const pt = proj.forward(p.p);
                return { x: pt[ 0 ], y: pt[ 1 ], t: p.t! };
            });
    }

}


export interface CurveDirectionIndicator {
    x: number; // anchor projected position
    y: number;
    a: number; // arrow angle in radians
}

export class CurveVisitor {

    static F = 0.3; // arrow at 30% along line/arc

    proj!: Projection;
    arrows: CurveDirectionIndicator[] = [];


    private visitLinearCurve(pts: Position[]): void {
        const { F } = CurveVisitor;
        const { xs, ys } = this.proj.forwardArray(pts);
        for (let i = 0; i < pts.length - 1;) {
            const x1 = xs[ i ], y1 = ys[ i++ ];
            const x2 = xs[ i ], y2 = ys[ i ];
            this.arrows.push({
                x: x1 + (x2 - x1) * F,
                y: y1 + (y2 - y1) * F,
                a: Math.atan2(y2 - y1, x2 - x1),
            });
        }
    }

    private visitCircularString(pts: Position[]): void {
        const { F } = CurveVisitor, TAU = 2 * Math.PI;
        const { xs, ys } = this.proj.forwardArray(pts);
        for (let i = 0; i <= pts.length - 3;) {
            const x1 = xs[ i ], y1 = ys[ i++ ];
            const x2 = xs[ i ], y2 = ys[ i++ ];
            const x3 = xs[ i ], y3 = ys[ i ];
            if (x1 === x3 && y1 === y3) {
                // closed circular arc (A B A)
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;
                const r = Math.hypot(x2 - x1, y2 - y1) / 2;

                const a1 = Math.atan2(y1 - cy, x1 - cx);
                const arrowAngle = a1 + F * TAU;
                this.arrows.push({
                    x: cx + r * Math.cos(arrowAngle),
                    y: cy + r * Math.sin(arrowAngle),
                    a: arrowAngle + Math.PI / 2,
                });
                continue;
            }

            const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
            const s1 = x1 * x1 + y1 * y1;
            const s2 = x2 * x2 + y2 * y2;
            const s3 = x3 * x3 + y3 * y3;
            const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / d;
            const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / d;
            const r = Math.hypot(cx - x1, cy - y1);
            if (Math.abs(d) < 1e-8 || !isFinite(r)) {
                this.arrows.push({
                    x: x1 + (x3 - x1) * F,
                    y: y1 + (y3 - y1) * F,
                    a: Math.atan2(y3 - y1, x3 - x1),
                });
                continue;
            }

            const cw = ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) > 0 ? 1 : 0;
            const a1 = Math.atan2(y1 - cy, x1 - cx);
            const a3 = Math.atan2(y3 - cy, x3 - cx);
            let arcAngle = a3 - a1;
            arcAngle += cw ? (arcAngle < 0 ? TAU : 0) : (arcAngle > 0 ? -TAU : 0);
            const arrowAngle = a1 + arcAngle * F;
            this.arrows.push({
                x: cx + r * Math.cos(arrowAngle),
                y: cy + r * Math.sin(arrowAngle),
                a: arrowAngle + (cw ? Math.PI / 2 : -Math.PI / 2),
            });
        }
    }

    private visitGeometry(geom: JSON_Geometry): void {
        switch (geom.type) {

            // points
            case 'Point':
            case 'MultiPoint' : {
                return;
            }

            // curves
            case 'LineString': {
                this.visitLinearCurve(geom.coordinates);
                return;
            }
            case 'MultiLineString': {
                for (const pts of geom.coordinates) {
                    this.visitLinearCurve(pts);
                }
                return;
            }
            case 'CircularString': {
                this.visitCircularString(geom.coordinates);
                return;
            }
            case 'CompoundCurve': {
                for (const sub of geom.segments) {
                    this.visitGeometry(sub);
                }
                return;
            }
            case 'MultiCurve': {
                for (const sub of geom.curves) {
                    this.visitGeometry(sub);
                }
                return;
            }

            // surfaces
            case 'Polygon': {
                for (const pts of geom.coordinates) {
                    this.visitLinearCurve(pts);
                }
                return;
            }
            case 'MultiPolygon': {
                for (const ppts of geom.coordinates) {
                    for (const pts of ppts) {
                        this.visitLinearCurve(pts);
                    }
                }
                return;
            }
            case 'CurvePolygon': {
                for (const sub of geom.rings) {
                    this.visitGeometry(sub);
                }
                return;
            }
            case 'MultiSurface': {
                for (const surface of geom.surfaces) {
                    this.visitGeometry(surface);
                }
                return;
            }

            // mixed collection
            case 'GeometryCollection': {
                for (const geometry of geom.geometries) {
                    this.visitGeometry(geometry);
                }
                return;
            }

        }
    }


    static getIndicators(geom: JSON_Geometry, proj: Projection): CurveDirectionIndicator[] {
        const visitor = new CurveVisitor();
        visitor.proj = proj;
        visitor.visitGeometry(geom);
        return visitor.arrows;
    }

}
