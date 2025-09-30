export interface Palette {
    background: string;
    grid: string; // grid stroke color
    active: string;
    colors: string[];
}

export const palettes: Record<'dark' | 'light', Palette> = {
    light: {
        background: '#fcfbf7',
        grid: '#807a781a',
        active: '#474747',
        colors: [
            '#00e6bb',
            '#8bcc00',
            '#e600b8',
            '#b39800',
            '#63c7e6',
            '#ff80ce',
            '#ff5f1f',
            '#5b5efd',
        ],
    },
    dark: {
        background: '#292828',
        grid: '#ebdbb90f',
        active: '#ffffff',
        colors: [
            '#00ffd2',
            '#b0ff00',
            '#ff00f4',
            '#fdff00',
            '#009fff',
            '#ff80ce',
            '#ffaa00',
            '#aa00ff',
        ],
    },
};


export interface PointStyle {
    r: number;
    fill: string;
    stroke: string;
    stroke_width: number;
}

export interface CurveStyle {
    stroke: string;
    stroke_width: number;
}

export interface SurfaceStyle {
    fill: string;
    stroke: string;
    stroke_width: number;
}

export interface VertexStyle {
    fill: string;
}

export interface DirectionArrowStyle {
    stroke: string;
    stroke_width: number;
}

export interface ShapesStyle {
    point: PointStyle;
    curve: CurveStyle;
    surface: SurfaceStyle;
    vertex: VertexStyle;
    arrow: DirectionArrowStyle;
}

export interface FeatureStyle {
    default: ShapesStyle;
    hover: ShapesStyle;
    active: ShapesStyle;
}

export interface VertexShadowStyle {
    fill: string;
}

export interface PreviewStyles {
    background: string;
    grid: string; // grid stroke color
    vertexShadow: VertexShadowStyle;
    colors: FeatureStyle[];
}

export function createStyles(palette: Palette): PreviewStyles {
    const a20 = '33'; // ((0.2 * 255) | 0).toString(16).padStart(2, '0')
    const a60 = '99';
    const a80 = 'cc';
    return {
        background: palette.background,
        grid: palette.grid,
        vertexShadow: {
            fill: palette.active + a60,
        },
        colors: palette.colors.map<FeatureStyle>(color => ({
            default: {
                point: {
                    r: 4,
                    fill: color + a20,
                    stroke: color + a60,
                    stroke_width: 1.5,
                },
                curve: {
                    stroke: color + a60,
                    stroke_width: 1.5,
                },
                surface: {
                    fill: color + a20,
                    stroke: color + a60,
                    stroke_width: 1.5,
                },
                vertex: {
                    fill: color + a60,
                },
                arrow: {
                    stroke: color + a60,
                    stroke_width: 1.5,
                },
            },
            hover: {
                point: {
                    r: 4,
                    fill: color + a60,
                    stroke: palette.active + a80,
                    stroke_width: 2,
                },
                curve: {
                    stroke: palette.active + a80,
                    stroke_width: 2,
                },
                surface: {
                    fill: color + a60,
                    stroke: palette.active + a80,
                    stroke_width: 2,
                },
                vertex: {
                    fill: palette.active + a80,
                },
                arrow: {
                    stroke: palette.active + a80,
                    stroke_width: 2,
                },
            },
            active: {
                point: {
                    r: 4,
                    fill: color + a80,
                    stroke: palette.active,
                    stroke_width: 2,
                },
                curve: {
                    stroke: palette.active,
                    stroke_width: 2,
                },
                surface: {
                    fill: color + a80,
                    stroke: palette.active,
                    stroke_width: 2,
                },
                vertex: {
                    fill: palette.active,
                },
                arrow: {
                    stroke: palette.active,
                    stroke_width: 2,
                },
            },
        })),
    };
}
