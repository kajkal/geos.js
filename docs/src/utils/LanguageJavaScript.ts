import React from 'react';
import type L from 'leaflet';
import { Options as AcornOptions, parse, Pattern, Program, Token, tokTypes } from 'acorn';
import { escapeHtml, Language } from '@site/src/utils/Language';


export const KEY = Symbol('key');
export const GGEOM = Symbol('geos-geom');
export const LAYER = Symbol('layer');
export const ACTIVE = Symbol('is-active');
export const COLOR = Symbol('i');

export interface FeatureData {
    id: string; // variable name
    type: 'Feature';
    properties: object;
    geometry: ReturnType<typeof window.geos.Geometry.prototype.toJSON>;
    [ KEY ]: string;
    [ COLOR ]: number;
    [ ACTIVE ]?: boolean;
    [ GGEOM ]?: InstanceType<typeof window.geos.Geometry>;
    [ LAYER ]?: L.GeoJSON;
}

export type ValueData = [ key: string, value: any ];

export interface EvalCodeResult {
    code: string;
    values?: ValueData[];
    features?: FeatureData[];
    bbox: [ xMin: number, yMin: number, xMax: number, yMax: number ];
    errors?: Error[];
}

export class LanguageJavaScript extends Language {

    acornOptions: AcornOptions;

    // to reuse AST between highlight and eval
    lastCode?: string;
    lastAST?: Program;

    constructor(highlightOnly?: boolean) {
        super();
        this.acornOptions = {
            ecmaVersion: 'latest',
            sourceType: 'script',
        };
        if (highlightOnly) {
            this.acornOptions.allowAwaitOutsideFunction = true;
        }
    }

    highlight = (code: string): React.ReactNode => {
        try {
            const formatted: string[] = [];
            let prevToken: Token;
            let lastIndex = 0;

            const addToken = (type: CodeTokenType, start: number, end: number) => {
                if (lastIndex !== start) {
                    formatted.push(escapeHtml(code.slice(lastIndex, start)));
                }
                formatted.push(`<span class='code-token' data-type='${type}'>${escapeHtml(code.slice(start, end))}</span>`);
                lastIndex = end;
            };

            const ast = parse(code, {
                ...this.acornOptions,
                onComment: (_isBlock, _text, start, end) => {
                    addToken('comment', start, end);
                },
                onToken: (token) => {
                    if (token.type.keyword) {
                        addToken('keyword', token.start, token.end);
                    } else {
                        switch (token.type) {
                            case tokTypes.num:
                            case tokTypes.regexp: {
                                addToken(token.type.label as 'num' | 'regexp', token.start, token.end);
                                break;
                            }
                            case tokTypes.string:
                            case tokTypes.template:
                            case tokTypes.backQuote: {
                                addToken('string', token.start, token.end);
                                break;
                            }
                            case tokTypes.name: {
                                const type = specialNames.get((token as any).value) || token.type.label as 'name';
                                addToken(type, token.start, token.end);
                                break;
                            }
                            case tokTypes.comma:
                            case tokTypes.semi: {
                                addToken('punctuation', token.start, token.end);
                                break;
                            }
                            case tokTypes.parenL: {
                                if (prevToken?.type === tokTypes.name) {
                                    const i = formatted.length - 1;
                                    formatted[ i ] = formatted[ i ].replace(`'name'`, `'function'`);
                                }
                            }
                        }
                    }
                    prevToken = token;
                },
            });

            if (lastIndex !== code.length) {
                formatted.push(escapeHtml(code.slice(lastIndex)));
            }
            formatted.push('<br/>');

            this.lastCode = code;
            this.lastAST = ast;

            return React.createElement('code', {
                dangerouslySetInnerHTML: { __html: formatted.join('') },
            });
        } catch (e) {
            if ('pos' in e && 'raisedAt' in e) {
                let { pos, raisedAt } = e;
                if (pos === raisedAt) pos--;
                const formatted = [
                    escapeHtml(code.slice(0, pos)),
                    `<span class='code-error'>${escapeHtml(code.slice(pos, raisedAt))}</span>`,
                    escapeHtml(code.slice(raisedAt)),
                    '<br/>',
                ];
                return React.createElement('code', {
                    dangerouslySetInnerHTML: { __html: formatted.join('') },
                });
            }
            return React.createElement('code', {
                dangerouslySetInnerHTML: { __html: escapeHtml(code) + '<br/>' },
            });
        }
    };

    evalCode(code: string): EvalCodeResult {
        try {
            const ast = (this.lastCode = code)
                ? this.lastAST
                : parse(code, this.acornOptions);

            // get names of the variables declared in snippet 'global' scope
            const varNames = [];
            for (const node of ast.body) {
                if (node.type === 'VariableDeclaration') {
                    for (const declaration of node.declarations) {
                        if (declaration.id) {
                            getVarNamesFromPattern(declaration.id, varNames);
                        }
                    }
                }
            }

            // evaluate code
            const result = new Function(...window.___params, code + `\nreturn {${varNames}}`)(...window.___args);

            // sort values
            const values: ValueData[] = [];
            const features: FeatureData[] = [];
            let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            let i = 0;

            const key = Math.random().toString(36).slice(2);

            function addFeature(k: string, v: InstanceType<typeof window.geos.Geometry>) {
                if (!renderableGeometryTypes.has(v.type()) || window.geos.isEmpty(v)) {
                    values.push([ k, window.geos.toWKT(v) ]);
                } else {
                    features.push({
                        id: k,
                        type: 'Feature',
                        properties: {},
                        geometry: v.toJSON(),
                        [ KEY ]: key + k,
                        [ COLOR ]: (i++) % 8,
                        [ GGEOM ]: v,
                    });
                    const bbox = window.geos.bounds(v);
                    x1 = Math.min(x1, bbox[ 0 ]);
                    y1 = Math.min(y1, bbox[ 1 ]);
                    x2 = Math.max(x2, bbox[ 2 ]);
                    y2 = Math.max(y2, bbox[ 3 ]);
                }
            }

            for (const k in result) {
                const v = result[ k ];
                if (Array.isArray(v) && v.every(el => el instanceof window.geos.Geometry)) {
                    for (let j = 0; j < v.length; j++) {
                        addFeature(`${k}[${j}]`, v[ j ]);
                    }
                } else if (v instanceof window.geos.Geometry) {
                    addFeature(k, v);
                } else {
                    values.push([ k, v ]);
                }
            }

            return {
                code,
                values,
                features,
                bbox: [
                    (isFinite(x1) ? x1 : 0) - 1,
                    (isFinite(y1) ? y1 : 0) - 1,
                    (isFinite(x2) ? x2 : 0) + 1,
                    (isFinite(y2) ? y2 : 0) + 1,
                ],
            };
        } catch (e) {
            return {
                code,
                errors: [ e ],
                bbox: [ -1, -1, 1, 1 ],
            };
        }
    }

}


type CodeTokenType = 'comment' | 'keyword' | 'num' | 'string' | 'regexp' | 'name' | 'function' | 'punctuation';

const specialNames = new Map([
    [ 'NaN', 'num' ],
    [ 'Infinity', 'num' ],
    [ 'let', 'keyword' ],
    [ 'of', 'keyword' ],
    [ 'async', 'keyword' ],
    [ 'await', 'keyword' ],
] as const);

const renderableGeometryTypes = new Set([
    'Point', 'MultiPoint',
    'LineString', 'MultiLineString',
    'Polygon', 'MultiPolygon',
    'GeometryCollection',
]);

function getVarNamesFromPattern(pattern: Pattern, varNames: string[]) {
    switch (pattern.type) {

        case 'Identifier': {
            varNames.push(pattern.name);
            break;
        }

        case 'ObjectPattern': {
            for (const property of pattern.properties) {
                if (property.type === 'Property') {
                    getVarNamesFromPattern(property.value, varNames);
                } else if (property.type === 'RestElement') {
                    getVarNamesFromPattern(property.argument, varNames);
                }
            }
            break;
        }

        case 'ArrayPattern': {
            for (const element of pattern.elements) {
                if (element) {
                    if (element.type === 'Identifier') {
                        varNames.push(element.name);
                    } else if (element.type === 'RestElement') {
                        getVarNamesFromPattern(element.argument, varNames);
                    } else if (element.type === 'AssignmentPattern') {
                        getVarNamesFromPattern(element.left, varNames);
                    } else {
                        getVarNamesFromPattern(element, varNames);
                    }
                }
            }
            break;
        }

        case 'AssignmentPattern': {
            getVarNamesFromPattern(pattern.left, varNames);
            break;
        }

        case 'RestElement': {
            getVarNamesFromPattern(pattern.argument, varNames);
            break;
        }

    }
}
