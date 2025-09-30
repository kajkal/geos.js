export type PositionXY = [ x: number, y: number ];

export class Projection {

    ts: number; // target size
    dx: number;
    dy: number;
    fx: number;
    fy: number;

    constructor(targetSize: number, flipY: boolean, dx: number, dy: number, f: number) {
        this.ts = targetSize;
        this.dx = dx;
        this.dy = dy;
        this.fx = f;
        this.fy = flipY ? -f : f;
    }

    static fromBBox(bbox: BBox, targetSize: number): Projection {
        const f = targetSize / (Math.max(bbox.w, bbox.h) || 10);
        return new Projection(targetSize, true, -bbox.x1, -bbox.y1, f);
    }

    forward(pt: number[]): PositionXY {
        const x = (pt[ 0 ] + this.dx) * this.fx;
        const y = (pt[ 1 ] + this.dy) * this.fy;
        if (!isFinite(x) || !isFinite(y)) {
            throw new Error(`Invalid coordinate [ ${pt.join(', ')} ]`);
        }
        return [ x, y ];
    }

    forwardArray(pts: number[][], bbox?: BBox): { xs: Float64Array; ys: Float64Array; } {
        const n = pts.length;
        const ab = new ArrayBuffer(n * 16);
        const xs = new Float64Array(ab, 0, n);
        const ys = new Float64Array(ab, n * 8, n);
        const { dx, dy, fx, fy } = this;
        for (let i = 0; i < n; i++) {
            const x = xs[ i ] = (pts[ i ][ 0 ] + dx) * fx;
            const y = ys[ i ] = (pts[ i ][ 1 ] + dy) * fy;
            if (!isFinite(x) || !isFinite(y)) {
                throw new Error(`Invalid coordinate [ ${pts[ i ].join(', ')} ]`);
            }
            if (bbox) bbox.addXY(x, y);
        }
        return { xs, ys };
    }

    forwardBBox(bbox: BBox): BBox {
        let { x1, y1, x2, y2 } = bbox;
        [ x1, y1 ] = this.forward([ x1, y1 ]);
        [ x2, y2 ] = this.forward([ x2, y2 ]);
        return new BBox(y1 < y2 ? [ x1, y1, x2, y2 ] : [ x1, y2, x2, y1 ]);
    }

    inverse(pt: number[]): PositionXY {
        const x = pt[ 0 ] / this.fx - this.dx;
        const y = pt[ 1 ] / this.fy - this.dy;
        return [ x, y ];
    }

}


export class BBox {

    x1: number = Infinity;
    y1: number = Infinity;
    x2: number = -Infinity;
    y2: number = -Infinity;

    get w() {
        return this.x2 - this.x1;
    }

    get h() {
        return this.y2 - this.y1;
    }

    get cx() {
        return (this.x1 + this.x2) / 2;
    }

    get cy() {
        return (this.y1 + this.y2) / 2;
    }

    constructor(bbox?: number[]) {
        if (bbox) {
            this.x1 = bbox[ 0 ];
            this.y1 = bbox[ 1 ];
            this.x2 = bbox[ 2 ];
            this.y2 = bbox[ 3 ];
        }
    }

    private static CARDINALS = [ 0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2 ];

    addXY(x: number, y: number) {
        if (x < this.x1) this.x1 = x;
        if (y < this.y1) this.y1 = y;
        if (x > this.x2) this.x2 = x;
        if (y > this.y2) this.y2 = y;
    }

    addArc(cx: number, cy: number, r: number, a1: number, a3: number, ccw: boolean) {
        const TAU = Math.PI * 2;
        const start = ((a1 % TAU) + TAU) % TAU;
        const end = ((a3 % TAU) + TAU) % TAU;
        for (const ca of BBox.CARDINALS) {
            const onArc = ccw
                ? start >= end
                    ? ca <= start && ca >= end
                    : ca <= start || ca >= end
                : end >= start
                    ? ca >= start && ca <= end
                    : ca >= start || ca <= end;
            if (onArc) {
                this.addXY(cx + r * Math.cos(ca), cy + r * Math.sin(ca));
            }
        }
    }

}
