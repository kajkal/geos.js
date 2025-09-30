import KDBush from 'kdbush';
import Flatbush from 'flatbush';
import { zoom as d3_zoom, type ZoomBehavior, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { select, type Selection } from 'd3-selection';
import { axisRight, axisTop } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Geometry, JSON_Geometry } from 'geos.js';
import { CurveDirectionIndicator, CurveVisitor, RenderWarning, Shape, ShapeBuilder, Vertex, VertexIndicator, VertexVisitor } from '@site/src/components/Preview/renderer/jsonToPath2D';
import { createStyles, Palette, PreviewStyles, ShapesStyle } from '@site/src/components/Preview/renderer/styles';
import { BBox, PositionXY, Projection } from '@site/src/components/Preview/renderer/utils';
import { FeatureVar } from '@site/src/utils/LanguageJavaScript';

import styles from '../styles.module.css';


export class Feature {

    name: string; // variable name from the input script
    geom: Geometry; // GEOS geometry
    c: number; // color index

    detached?: boolean;
    empty?: boolean;
    error?: Error; // render error
    warnings?: RenderWarning[]; // render warnings

    json?: JSON_Geometry; // geometry JSON representation
    shapes?: Shape[];

    l?: Selection<HTMLLabelElement, Feature, null, unknown>; // feature `label` element

    isVisible: boolean = true;

    vMarkers?: VertexIndicator[];
    dMarkers?: CurveDirectionIndicator[];

    constructor(name: string, geom: Geometry, i: number) {
        this.name = name;
        this.geom = geom;
        this.c = i % 8;
        if (geom.detached) {
            this.detached = true;
        } else if (window.geos.isEmpty(geom)) {
            this.empty = true;
        }
        this.json = undefined;
        this.shapes = undefined;
        this.l = undefined;
        this.vMarkers = undefined;
        this.dMarkers = undefined;
    }

}


export interface RenderResult {
    logs?: Feature[];
}

type MarkerTemplates = [
    directionArrow: Path2D,
    defaultVertex: Path2D,
    ringStart: Path2D,
    arcMiddlePoint: Path2D,
];

interface Index {
    pointsIndex: KDBush,
    points: Float64Array,
    shapesIndex: Flatbush,
    shapes: Uint32Array,
}


export class Renderer {

    proj!: Projection;
    userUnitsPerPx = 1; // user units per pixel
    posFormatter = {
        s: 1, // meaningful step - visually distinguishable
        d: 0, // decimals count
    };

    root: Selection<HTMLElement, unknown, any, any>;
    canvas: Selection<HTMLCanvasElement, Renderer, any, any>;
    canvasEl: HTMLCanvasElement;

    svg: Selection<SVGSVGElement, unknown, any, any>;
    gGrid: Selection<SVGGElement, unknown, any, any>;
    gXScale: Selection<SVGGElement, unknown, any, any>;
    gYScale: Selection<SVGGElement, unknown, any, any>;
    xScale = scaleLinear();
    yScale = scaleLinear();

    zoomIndicator: Selection<HTMLSpanElement, unknown, any, any>;
    xPointerPos: Selection<HTMLSpanElement, unknown, any, any>;
    yPointerPos: Selection<HTMLSpanElement, unknown, any, any>;

    featureList: Selection<HTMLDivElement, Renderer, any, any>;

    popup: Selection<HTMLDivElement, unknown, any, any>;
    popupBounds: Selection<HTMLDivElement, unknown, any, any>;
    popupState: { d: Feature; pt: PositionXY; } | null = null;
    setPopup!: (popupData: Feature | null) => void;

    zoom: ZoomBehavior<HTMLCanvasElement, Renderer>;
    initialTransform?: ZoomTransform;
    t: ZoomTransform = zoomIdentity;


    /** view */
    ro: ResizeObserver;
    dpr!: number;
    viewBox!: { w: number; h: number; }; // canvas css width/height
    dataBBox?: BBox; // features total bbox in user units

    /** options */
    styles!: PreviewStyles;
    showVertices = false;
    showDirections = false;
    showGrid = true;

    /** rendering */
    ctx: CanvasRenderingContext2D;
    requestedFrameId: number | null = null;
    lastFrameTime = 0;
    markers = createMarkers();
    pendingResize = false;
    pendingGridCalibration = false;
    pendingGridUpdate = false;

    /** state */
    cssPos?: PositionXY; // pointer last css px position
    isPanning = false;
    features: Feature[] = [];
    hoveredFeature: Feature | null = null;
    focusedFeature: Feature | null = null;
    activeFeature: Feature | null = null;
    shadowAnchor: PositionXY | null = null;
    index: Index | undefined | null = undefined;


    constructor(rootEl: HTMLElement) {
        const root = this.root = select(rootEl);
        const canvas = this.canvas = root.select<HTMLCanvasElement>('canvas').datum(this as Renderer);
        const canvasEl = this.canvasEl = canvas.node()!;
        this.ctx = canvasEl.getContext('2d', { alpha: false })!;

        const svg = this.svg = root.select<SVGSVGElement>(`.${styles.svg}`);
        this.gGrid = svg.selectChild('g.grid');
        this.gXScale = svg.selectChild('g.x');
        this.gYScale = svg.selectChild('g.y');

        this.zoomIndicator = root.select('[data-type="zoom"]');
        this.xPointerPos = root.select('[data-type="x"]');
        this.yPointerPos = root.select('[data-type="y"]');
        this.featureList = root.select<HTMLDivElement>(`.${styles.featureList}`).datum(this as Renderer);

        this.popup = root.select(`.${styles.featurePopup}`);
        this.popupBounds = root.select(`.${styles.featurePopupBoundary}`);


        const zoom = this.zoom = d3_zoom<HTMLCanvasElement, Renderer>()
            .on('zoom', function handleZoom(e, _this) {
                _this.t = e.transform;

                _this.updateViewScale();
                _this.updateZoomIndicator();
                _this.updatePointerPos();
                _this.updatePopupPosition();

                _this.pendingGridUpdate = true;
                _this.requestRedraw();
            })
            .on('start', function (_e, _this) {
                _this.isPanning = true;
            })
            .on('end', function (_e, _this) {
                _this.isPanning = false;
            });
        canvas.call(zoom);

        this.updateCanvasSize();
        const ro = this.ro = new ResizeObserver(() => {
            this.pendingResize = true;
            this.pendingGridCalibration = true;
            this.pendingGridUpdate = true;
            this.requestRedraw();
        });
        ro.observe(canvasEl);

        canvas
            .on('pointermove', function handleCanvasPointerMove(e, _this) {
                const cssPos = _this.cssPos = _this.pointerEventToCssPos(e);
                if (_this.isPanning) return;

                _this.updatePointerPos(cssPos);
                const hit = _this.hitTest(cssPos);
                if (_this.hoveredFeature !== hit) {
                    if (_this.hoveredFeature) {
                        _this.unhighlightFeatureLabel(_this.hoveredFeature);
                    }
                    if (hit) {
                        _this.highlightFeatureLabel(hit);
                        _this.setHoveredFeature(hit);
                    } else {
                        _this.unsetHoveredFeature(hit);
                    }
                    _this.requestRedraw();
                }
            })
            .on('click', function handleCanvasClick(e, _this) {
                const cssPos = _this.cssPos = _this.pointerEventToCssPos(e);
                _this.updatePointerPos(cssPos);

                const hit = _this.hitTest(cssPos);
                if (hit) {
                    _this.openPopup(hit, _this.t.invert(cssPos));
                } else {
                    _this.closePopup();
                }
            });

        let lastToggledCheckbox: HTMLLabelElement | undefined;
        this.featureList
            .on('pointerover', function handleListPointerOver(event, _this) {
                const match = event.target.closest('label.feature');
                if (match) {
                    const d = select<HTMLLabelElement, Feature>(match).datum();
                    _this.setHoveredFeature(d);
                    if (d.shapes && d.isVisible) {
                        _this.requestRedraw();
                    }
                }
            })
            .on('pointerout', function handleListPointerOut(event, _this) {
                const match = event.target.closest('label.feature');
                if (match) {
                    const d = select<HTMLLabelElement, Feature>(match).datum();
                    _this.unsetHoveredFeature(d);
                    if (d.shapes && d.isVisible) {
                        _this.requestRedraw();
                    }
                }
            })
            .on('click', function handleListClick(event, _this) {
                const target = event.target;
                if (target.matches('input')) {
                    const match: HTMLLabelElement = target.closest('label.feature');
                    const d = select<HTMLLabelElement, Feature>(match).datum();

                    // fit into view when label is clicked while holding Alt key
                    if (event.altKey) {
                        event.preventDefault();
                        const bbox = _this.proj.forwardBBox(new BBox(window.geos.bounds(d.geom)));
                        const newTransform = _this.getFitTransform(bbox, 0.3);
                        _this.canvas.transition()
                            .duration(200)
                            .call(_this.zoom.transform, newTransform);
                        return;
                    }

                    // gmail like, checkbox range selected by shift gets state from last clicked item
                    const isVisible = !!target.checked;
                    let toSet = [ d ];
                    if (event.shiftKey && lastToggledCheckbox) {
                        const checkboxes = Array.from(match.parentNode?.children || []) as HTMLLabelElement[];
                        let i = checkboxes.indexOf(lastToggledCheckbox);
                        if (i === -1) i = Infinity;
                        const j = checkboxes.indexOf(match);
                        toSet = checkboxes
                            .slice(Math.min(j, i), Math.max(j, i) + 1)
                            .map(labelEl => select<HTMLLabelElement, Feature>(labelEl).datum());
                    }
                    if (_this.popupState?.d && toSet.includes(_this.popupState.d)) {
                        _this.closePopup();
                    }
                    for (const d of toSet) {
                        _this.setFeatureVisibility(d, isVisible);
                    }
                    lastToggledCheckbox = match;
                    _this.setFocusedFeature(d);
                    _this.requestRedraw();
                }
            })
            .on('focusin', function handleListFocusIn(event, _this) {
                const match = event.target.closest('label.feature');
                if (match) {
                    const d = select<SVGGElement, Feature>(match).datum();
                    _this.setFocusedFeature(d);
                    _this.requestRedraw();
                }
            })
            .on('focusout', function handleListFocusOut(event, _this) {
                const match = event.target.closest('label.feature');
                if (match) {
                    const d = select<SVGGElement, Feature>(match).datum();
                    _this.unsetFocusedFeature(d);
                    _this.requestRedraw();
                }
            });
    }

    cleanup() {
        this.ro.disconnect();
        if (this.requestedFrameId !== null) {
            cancelAnimationFrame(this.requestedFrameId);
        }
    }


    private hitTest([ cssX, cssY ]: PositionXY): Feature | null {
        const { dpr, ctx, features, t } = this;
        const padding = 4; // to include points and lines
        const [ x1, y1 ] = this.t.invert([ cssX - padding, cssY - padding ]);
        const [ x2, y2 ] = this.t.invert([ cssX + padding, cssY + padding ]);
        const index = this.index === undefined ? (this.index = this.indexFeatures()) : this.index;
        if (index) {
            const { shapesIndex, shapes } = index;
            const matches = shapesIndex.search(x1, y1, x2, y2)
                .sort((a, b) => b - a);

            const x = cssX * dpr, y = cssY * dpr;
            ctx.lineWidth = padding * 2 / t.k; // increase curve hit area
            for (let i of matches) {
                const f = features[ shapes[ i *= 2 ] ];
                if (!f.isVisible) continue;
                const s = f.shapes![ shapes[ i + 1 ] ], p = s.path;
                const hit = s.dim === 1
                    ? ctx.isPointInStroke(p, x, y) // curve
                    : ctx.isPointInPath(p, x, y, 'evenodd'); // point or surface
                if (hit) {
                    return f;
                }
            }
        }
        return null;
    }

    private updateViewScale(): void {
        const { t, proj } = this;
        const userUnitsPerPx = 1 / t.k / proj.fx;
        const exp = Math.floor(Math.log10(userUnitsPerPx));
        const f = userUnitsPerPx / Math.pow(10, exp);
        const nf = (f < 1.5) ? 1 : (f < 3) ? 2 : (f < 7) ? 5 : 10;
        const step = nf * Math.pow(10, exp);
        const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-12));
        this.userUnitsPerPx = userUnitsPerPx;
        this.posFormatter = { s: step, d: Math.min(d, 10) }; // 10 -> max decimals
    }

    private pointerEventToCssPos(e: PointerEvent): PositionXY {
        const rect = this.canvasEl.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top,
        ];
    }

    private updatePointerPos(cssPos = this.cssPos): void {
        if (!cssPos) return;
        const canvasPos = this.t.invert(cssPos);
        const pos = this.proj.inverse(canvasPos);
        const limit = 4 * this.userUnitsPerPx; // 4px in user units
        const index = this.index === undefined ? (this.index = this.indexFeatures()) : this.index;
        if (index) {
            let nearest: PositionXY | null = null, minSqDist = Infinity;
            for (let i of index.pointsIndex.range(pos[ 0 ] - limit, pos[ 1 ] - limit, pos[ 0 ] + limit, pos[ 1 ] + limit)) {
                const x = index.points[ i *= 2 ];
                const y = index.points[ i + 1 ];
                const dx = x - pos[ 0 ], dy = y - pos[ 1 ];
                const sqDist = dx * dx + dy * dy;
                if (sqDist < minSqDist) {
                    minSqDist = sqDist;
                    nearest = [ x, y ];
                }
            }
            nearest = Math.sqrt(minSqDist) <= limit ? nearest : null;
            if (nearest) {
                this.updatePointerPosIndicator(nearest[ 0 ], nearest[ 1 ], true);
            } else {
                this.updatePointerPosIndicator(pos[ 0 ], pos[ 1 ]);
            }

            // update nearest vertex shadow
            const prev = this.shadowAnchor;
            const next = nearest && this.proj.forward(nearest);
            if (prev?.[ 0 ] !== next?.[ 0 ] || prev?.[ 1 ] !== next?.[ 1 ]) {
                this.shadowAnchor = next;
                this.requestRedraw();
            }
        }
    }


    /** Indicators */

    private updateZoomIndicator(): void {
        const zoomScale = this.t.k * 100;
        const formattedZoomScale = zoomScale.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        this.zoomIndicator.text(`${formattedZoomScale}%`);
    }

    private updatePointerPosIndicator(x: number, y: number, exact?: boolean): void {
        const fontWeight = exact ? 'bold' : null;
        const { s, d } = this.posFormatter;
        const xPos = (s ? Math.round(x / s) * s : x).toFixed(d);
        const yPos = (s ? Math.round(y / s) * s : y).toFixed(d);
        this.xPointerPos.text(xPos).style('font-weight', fontWeight!);
        this.yPointerPos.text(yPos).style('font-weight', fontWeight!);
    }


    /** Popup */

    private openPopup(d: Feature, pt: PositionXY): void {
        const currentState = this.popupState;
        if (currentState) {
            this.unsetActiveFeature(currentState.d);
        }
        this.popupState = { d, pt };

        this.setActiveFeature(d);
        this.updatePopupPosition();
        this.popup.classed(styles.hidden, false);
        this.setPopup(d);
        if (currentState?.d === d) {
            this.panPopupIntoView();
        }
        this.requestRedraw();
    }

    closePopup(): void {
        if (this.popupState) {
            this.unsetActiveFeature(this.popupState.d);
            this.popupState = null;
            this.popup.classed(styles.hidden, true);
            this.setPopup(null);
            this.requestRedraw();
        }
    }

    panPopupIntoView() {
        const child = this.popup.node()!;
        const childRect = child.getBoundingClientRect();
        const parentRect = child.parentElement!.getBoundingClientRect();

        const d_top = childRect.top - parentRect.top;
        const d_left = childRect.left - parentRect.left;
        const d_right = parentRect.right - childRect.right;

        const m = 8;
        let dx = 0; // -(right) +(left)
        let dy = 0; // -(bottom) +(up)

        if (d_top < 0) {
            dy = -(d_top - m);
        }
        if (d_left < 0) {
            dx = -(d_left - m);
        } else if (d_right < 0) {
            dx = d_right - m;
        }

        if (dx || dy) {
            const { t, canvas, zoom } = this;
            canvas.transition()
                .duration(200)
                .call(zoom.transform, new ZoomTransform(t.k, t.x + dx, t.y + dy));
        }
    }

    private updatePopupPosition(): void {
        const state = this.popupState;
        if (!state) return;

        const [ cx, cy ] = this.t.apply(state.pt);
        this.popup
            .style('left', `${cx}px`)
            .style('top', `${cy}px`);
    }


    /** Rendering */

    private requestRedraw() {
        if (this.requestedFrameId !== null) return;
        this.requestedFrameId = requestAnimationFrame(this.frame);
    }

    private frame = (time: number): void => {
        this.requestedFrameId = null;

        if (this.pendingResize) {
            this.pendingResize = false;
            const { canvasEl, t, viewBox } = this;
            const [ cx, cy ] = t.invert([ viewBox.w / 2, viewBox.h / 2 ]);

            this.updateCanvasSize();
            this.updateViewScale();

            // keep view center and zoom scale stable on resize
            const w = canvasEl.width / this.dpr;
            const h = canvasEl.height / this.dpr;
            const k = t.k;
            const dx = w / 2 - k * cx;
            const dy = h / 2 - k * cy;
            this.canvas.call(this.zoom.transform, new ZoomTransform(k, dx, dy));
        }

        if (this.pendingGridCalibration) {
            this.pendingGridCalibration = false;
            this.calibrateScales();
        }

        if (this.pendingGridUpdate) {
            this.pendingGridUpdate = false;
            this.updateScalesAndGrid();
        }

        const { ctx, canvasEl, dpr, styles } = this;

        // clear canvas
        ctx.fillStyle = styles.background;
        ctx.resetTransform();
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

        this.drawFeatures(ctx, dpr);

        this.lastFrameTime = time;
    };

    private drawFeatures(ctx: CanvasRenderingContext2D, dpr: number): void {
        const { t, styles, features, hoveredFeature, focusedFeature, activeFeature, shadowAnchor } = this;

        const k = t.k, K = dpr * k, dx = dpr * t.x, dy = dpr * t.y;
        ctx.setTransform(K, 0, 0, K, dx, dy);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // draw all features
        for (const f of features) {
            if (!f.isVisible) continue;
            if (f === hoveredFeature || f === focusedFeature || f === activeFeature) continue;
            const style = styles.colors[ f.c ].default;
            this.drawFeature(ctx, f, style, dpr, k, K, dx, dy);
        }

        // draw active/focused/hovered features on top of others
        let f = activeFeature;
        if (f && f.isVisible) {
            const style = styles.colors[ f.c ].active;
            this.drawFeature(ctx, f, style, dpr, k, K, dx, dy);
        }
        f = focusedFeature;
        if (f && f.isVisible && f !== activeFeature) {
            const style = styles.colors[ f.c ].hover;
            this.drawFeature(ctx, f, style, dpr, k, K, dx, dy);
        }
        f = hoveredFeature;
        if (f && f.isVisible) {
            const style = styles.colors[ f.c ].hover;
            this.drawFeature(ctx, f, style, dpr, k, K, dx, dy);
        }

        // draw nearest vertex shadow
        if (shadowAnchor) {
            ctx.fillStyle = styles.vertexShadow.fill;
            const p = new Path2D();
            p.arc(shadowAnchor[ 0 ], shadowAnchor[ 1 ], 4 / k, 0, Math.PI * 2);
            ctx.fill(p);
        }
    }

    private drawFeature(ctx: CanvasRenderingContext2D, f: Feature, styles: ShapesStyle, dpr: number, k: number, K: number, dx: number, dy: number): void {
        if (!f.shapes) return;

        const TAU = Math.PI * 2;
        const { showVertices, showDirections, markers, proj } = this;

        for (const shape of f.shapes) {
            switch (shape.dim) {
                case 0: { // points
                    const s = styles.point, p = shape.path = new Path2D();
                    p.arc(shape.x, shape.y, s.r / k, 0, TAU);
                    ctx.fillStyle = s.fill;
                    ctx.strokeStyle = s.stroke;
                    ctx.lineWidth = s.stroke_width / k;
                    ctx.fill(p);
                    ctx.stroke(p);
                    break;
                }
                case 1: { // curve
                    const s = styles.curve, p = shape.path;
                    ctx.strokeStyle = s.stroke;
                    ctx.lineWidth = s.stroke_width / k;
                    ctx.stroke(p);
                    break;
                }
                case 2: { // surface
                    const s = styles.surface, p = shape.path;
                    ctx.fillStyle = s.fill;
                    ctx.strokeStyle = s.stroke;
                    ctx.lineWidth = s.stroke_width / k;
                    ctx.fill(p, 'evenodd');
                    ctx.stroke(p);
                    break;
                }
            }
        }

        if (showVertices) {
            const s = styles.vertex;
            ctx.fillStyle = s.fill;

            f.vMarkers ??= VertexVisitor.getIndicators(f.json!, proj);
            for (const m of f.vMarkers) {
                ctx.setTransform(dpr, 0, 0, dpr, m.x * K + dx, m.y * K + dy);
                ctx.fill(markers[ m.t ]);
            }
        }

        if (showDirections) {
            const directionArrow = markers[ 0 ];

            const s = styles.arrow;
            ctx.strokeStyle = s.stroke;
            ctx.lineWidth = s.stroke_width;

            f.dMarkers ??= CurveVisitor.getIndicators(f.json!, proj);
            for (const m of f.dMarkers) {
                ctx.setTransform(dpr, 0, 0, dpr, m.x * K + dx, m.y * K + dy);
                ctx.rotate(m.a);
                ctx.stroke(directionArrow);
            }
        }

        if (showVertices || showDirections) {
            ctx.setTransform(K, 0, 0, K, dx, dy);
        }
    }


    /** Other */

    private updateCanvasSize() {
        const { canvasEl } = this;
        const dpr = this.dpr = window.devicePixelRatio || 1;
        const rect = canvasEl.getBoundingClientRect();
        canvasEl.width = Math.max(1, Math.round(rect.right * dpr) - Math.round(rect.left * dpr));
        canvasEl.height = Math.max(1, Math.round(rect.bottom * dpr) - Math.round(rect.top * dpr));
        this.viewBox = { w: canvasEl.width / dpr, h: canvasEl.height / dpr };
    }

    private getFitTransform(bbox: BBox, padding: number): ZoomTransform {
        const { w: cssW, h: cssH } = this.viewBox;
        const { w, h } = bbox;
        const k = w || h ? Math.min(cssW / w, cssH / h) * (1 - padding) : 1;
        const dx = cssW / 2 - bbox.cx * k;
        const dy = cssH / 2 - bbox.cy * k;
        return new ZoomTransform(k, dx, dy);
    }

    private calibrateScales() {
        const { xScale, yScale, dataBBox, viewBox, proj } = this;
        if (dataBBox) {
            const { w: cssW, h: cssH } = viewBox;
            const { x1, y1 } = dataBBox;
            xScale.domain([ x1, x1 + (cssW / proj.fx) ]).range([ 0, cssW ]);
            yScale.domain([ y1 + (cssH / proj.fy), y1 ]).range([ cssH, 0 ]);
        }
    }

    private updateScalesAndGrid() {
        const { t, xScale, yScale, gXScale, gYScale, gGrid, viewBox } = this;
        const x = t.rescaleX(xScale);
        const y = t.rescaleY(yScale);
        const xTicksCount = viewBox.w / 60;
        const yTicksCount = viewBox.h / 60;

        gXScale
            .attr('transform', `translate(0,${viewBox.h})`)
            .call(axisTop(x).offset(0).tickSize(4).ticks(xTicksCount));

        gYScale
            .call(axisRight(y).offset(0).tickSize(4).ticks(yTicksCount));

        gGrid
            .call(g => g
                .selectAll('.x')
                .data(x.ticks(xTicksCount))
                .join(
                    enter => enter
                        .append('line')
                        .attr('class', 'x')
                        .attr('y2', viewBox.h),
                    update => update
                        .attr('y2', viewBox.h),
                    exit => exit.remove(),
                )
                .attr('x1', d => x(d))
                .attr('x2', d => x(d)),
            )
            .call(g => g
                .selectAll('.y')
                .data(y.ticks(yTicksCount))
                .join(
                    enter => enter
                        .append('line')
                        .attr('class', 'y')
                        .attr('x2', viewBox.w),
                    update => update
                        .attr('x2', viewBox.w),
                    exit => exit.remove(),
                )
                .attr('y1', d => y(d))
                .attr('y2', d => y(d)),
            );
    }

    private indexFeatures(): Index | null {
        const { features } = this;

        let totalPointsCount = 0;
        let totalShapesCount = 0;

        const verticesArray: (Vertex[] | undefined)[] = Array(features.length);
        for (let i = 0; i < features.length; i++) {
            const f = features[ i ];
            if (!f.json) continue;
            const vertices = verticesArray[ i ] = VertexVisitor.getVertices(f.json);
            totalPointsCount += vertices.length;
            totalShapesCount += f.shapes!.length;
        }

        if (!totalShapesCount) return null;

        const points = new Float64Array(totalPointsCount * 2);
        const shapes = new Uint32Array(totalShapesCount * 2);
        let p = 0, s = 0;

        const pointsIndex = new KDBush(totalPointsCount);
        const shapesIndex = new Flatbush(totalShapesCount);
        for (let i = 0; i < features.length; i++) {
            const f = features[ i ];
            const vertices = verticesArray[ i ];
            if (vertices) {
                for (const v of vertices) {
                    points[ p++ ] = v.p[ 0 ];
                    points[ p++ ] = v.p[ 1 ];
                    pointsIndex.add(v.p[ 0 ], v.p[ 1 ]);
                }
            }
            if (f.shapes) {
                for (let j = 0; j < f.shapes.length; j++) {
                    shapes[ s++ ] = i;
                    shapes[ s++ ] = j;
                    const shape = f.shapes[ j ];
                    if (shape.dim) {
                        shapesIndex.add(shape.bbox.x1, shape.bbox.y1, shape.bbox.x2, shape.bbox.y2);
                    } else {
                        shapesIndex.add(shape.x, shape.y);
                    }
                }
            }
        }
        pointsIndex.finish();
        shapesIndex.finish();

        return {
            pointsIndex,
            points,
            shapesIndex,
            shapes,
        };
    }


    /** API */

    render(featureVars: FeatureVar[]): RenderResult {
        this.closePopup();
        this.hoveredFeature = null;
        this.activeFeature = null;
        this.focusedFeature = null;
        this.index = undefined;

        const logs: Feature[] = [];

        const bounds = this.dataBBox = new BBox();
        const features = this.features = featureVars
            .map(({ name, geom }, i) => {
                const d = new Feature(name, geom, i);
                if (!d.detached && !d.empty) {
                    const bbox = window.geos.bounds(geom);
                    if (bbox.every(isFinite)) {
                        bounds.addXY(bbox[ 0 ], bbox[ 1 ]);
                        bounds.addXY(bbox[ 2 ], bbox[ 3 ]);
                    }
                }
                return d;
            });

        bounds.x1 = isFinite(bounds.x1) ? bounds.x1 : 0;
        bounds.y1 = isFinite(bounds.y1) ? bounds.y1 : 0;
        bounds.x2 = isFinite(bounds.x2) ? bounds.x2 : 0;
        bounds.y2 = isFinite(bounds.y2) ? bounds.y2 : 0;

        const proj = this.proj = Projection.fromBBox(bounds, 1000); // normalize coords to 0..1000

        for (const f of features) {
            if (f.detached || f.empty) continue;
            try {
                const { geometry } = window.geos.toGeoJSON(f.geom, { flavor: 'extended', layout: 'XY' });
                const result = ShapeBuilder.build(geometry, proj);

                if (result.warnings.length) {
                    f.warnings = result.warnings;
                    logs.push(f);
                }

                f.json = geometry;
                f.shapes = result.shapes;
            } catch (e: any) {
                f.error = e;
                logs.push(f);
            }
        }

        this.featureList
            .selectAll<HTMLLabelElement, Feature>('label.feature')
            .data(features, d => d.name)
            .join(
                enter => {
                    const label = enter
                        .append('label')
                        .attr('class', 'feature');

                    label.append('input')
                        .attr('type', 'checkbox')
                        .property('checked', true);

                    label.append('span')
                        .text(d => d.name);

                    return label;
                },
                update => update
                    .each(function (d) {
                        // use previously set visibility state for feature with this name
                        const visible = select(this)
                            .classed('hover', false) // clear prev hover state
                            .select('input')
                            .property('checked');

                        if (!visible) {
                            d.isVisible = false;
                        }
                    }),
                exit => exit.remove(),
            )
            .each(function (d) {
                const label = select<HTMLLabelElement, Feature>(this);
                d.l = label;

                let disabled;
                let status: 'detached' | 'empty' | 'error' | 'warn' | null;
                let type: string;
                let title: string | null;

                if (d.detached) {
                    disabled = true;
                    status = 'detached';
                    type = `Detached ${d.geom.type}`;
                    title = null;
                } else if (d.empty) {
                    disabled = true;
                    status = 'empty';
                    type = `Empty ${d.geom.type}`;
                    title = null;
                } else if (d.error) {
                    disabled = true;
                    status = 'error';
                    type = d.geom.type;
                    title = 'Render error';
                } else if (d.warnings) {
                    disabled = false;
                    status = 'warn';
                    type = d.geom.type;
                    title = 'Render warnings';
                } else {
                    disabled = false;
                    status = null;
                    type = d.geom.type;
                    title = null;
                }

                label.attr('data-status', status)
                    .attr('title', title);

                label.select('input')
                    .property('indeterminate', disabled)
                    .attr('disabled', disabled || null);

                label.select('span')
                    .attr('data-type', type);
            });

        this.features = features;

        // fit into view if needed
        const newInitialTransform = this.getFitTransform(proj.forwardBBox(bounds), 0.3);
        if (this.initialTransform?.toString() !== newInitialTransform.toString()) {
            this.initialTransform = newInitialTransform;
            this.canvas.call(this.zoom.transform, newInitialTransform);
            this.updatePointerPosIndicator(bounds.cx, bounds.cy);
        }

        this.pendingGridCalibration = true;
        this.pendingGridUpdate = true;
        this.requestRedraw();

        return { logs };
    }

    setShowVertices(newState: boolean): void {
        this.showVertices = newState;
        this.requestRedraw();
    }

    setShowDirections(newState: boolean): void {
        this.showDirections = newState;
        this.requestRedraw();
    }

    setShowGrid(newState: boolean): void {
        this.showGrid = newState;
        this.svg.style('display', newState ? '' : 'none');
    }

    setStyles(palette: Palette): void {
        const styles = this.styles = createStyles(palette);
        this.svg.style('--grid-stroke', styles.grid);
        this.requestRedraw();
    }

    resetView(): void {
        const { proj, dataBBox } = this;
        if (dataBBox) {
            const newInitialTransform = this.getFitTransform(proj.forwardBBox(dataBBox), 0.3);
            this.initialTransform = newInitialTransform;
            this.canvas.call(this.zoom.transform, newInitialTransform);
        }
    }

    async toggleFullscreen(): Promise<void> {
        const rootEl = this.root.node()!;
        if (rootEl.matches(':fullscreen')) {
            await document.exitFullscreen?.();
        } else {
            await rootEl.requestFullscreen?.();
        }
    }

    async saveScreenshot(dpr: number = this.dpr): Promise<void> {
        const { viewBox, styles, svg } = this;
        const cssW = viewBox.w, cssH = viewBox.h;
        const w = viewBox.w * dpr, h = viewBox.h * dpr;

        function cloneNodeAndStyles(svg: SVGSVGElement): SVGSVGElement {
            const clone = svg.cloneNode(true) as SVGSVGElement;

            function inlineStyles(el: Element, orig: Element) {
                const children = el.children;
                const origChildren = orig.children;

                for (let i = 0; i < children.length; i++) {
                    inlineStyles(children[ i ], origChildren[ i ]);
                }

                const computed = window.getComputedStyle(orig);
                let rules = [];
                for (let i = 0; i < computed.length; i++) {
                    const key = computed[ i ];
                    rules.push(`${key}:${computed.getPropertyValue(key)};`);
                }
                el.setAttribute('style', rules.join(''));
            }

            inlineStyles(clone, svg);
            return clone;
        }

        const canvasEl = document.createElement('canvas');
        canvasEl.width = w;
        canvasEl.height = h;
        canvasEl.style.width = `${cssW}px`;
        canvasEl.style.height = `${cssH}px`;

        const svgEl = cloneNodeAndStyles(svg.node()!);
        svgEl.setAttribute('width', `${cssW}px`);
        svgEl.setAttribute('height', `${cssH}px`);
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([ svgData ], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const svgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = svgUrl;
        });

        const ctx = canvasEl.getContext('2d', { alpha: false })!;
        ctx.fillStyle = styles.background;
        ctx.fillRect(0, 0, w, h);
        this.drawFeatures(ctx, dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(svgImg, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvasEl.toBlob(blob => blob ? resolve(blob) : reject());
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'geos.js.png';
        a.click();

        setTimeout(() => {
            URL.revokeObjectURL(svgUrl);
            URL.revokeObjectURL(url);
        }, 250);
    }


    private setHoveredFeature(f: Feature) {
        this.hoveredFeature = f;
    }

    private unsetHoveredFeature(f: Feature | null) {
        this.hoveredFeature = null;
    }

    private setFocusedFeature(f: Feature) {
        this.focusedFeature = f;
    }

    private unsetFocusedFeature(f: Feature) {
        this.focusedFeature = null;
    }

    private setActiveFeature(f: Feature) {
        this.activeFeature = f;
    }

    private unsetActiveFeature(f: Feature) {
        this.activeFeature = null;
    }

    private highlightFeatureLabel(f: Feature) {
        const labelEl = f.l?.classed('hover', true).node();
        if (labelEl) {
            scrollIntoView(labelEl, {
                scrollMode: 'if-needed',
                block: 'nearest',
                boundary: labelEl.parentElement,
            });
        }
    }

    private unhighlightFeatureLabel(f: Feature) {
        f.l?.classed('hover', false);
    }

    private setFeatureVisibility(f: Feature, isVisible: boolean) {
        f.isVisible = isVisible;
        f.l?.select('input').property('checked', isVisible);
    }

}


function createMarkers(): MarkerTemplates {
    const TAU = Math.PI * 2;

    const directionArrow = new Path2D('m-2-4 5 4-5 4');

    const defaultVertex = new Path2D();
    defaultVertex.arc(0, 0, 2.2, 0, TAU);

    const ringStart = new Path2D();
    const A = 5, a = A / 2;
    ringStart.rect(-a, -a, A, A);

    const arcMiddlePoint = new Path2D();
    const R = 4.5, starPoints = 5;
    const r = R * Math.cos(TAU / starPoints) / Math.cos(Math.PI / starPoints);
    const step = Math.PI / starPoints, start = -Math.PI / 2;
    for (let i = 0; i < starPoints * 2; i++) {
        const angle = start + i * step;
        const radius = (i % 2) ? r : R;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i) arcMiddlePoint.lineTo(x, y);
        else arcMiddlePoint.moveTo(x, y);
    }
    arcMiddlePoint.closePath();

    return [
        directionArrow,
        defaultVertex,
        ringStart,
        arcMiddlePoint,
    ];
}
