import React from 'react';
import { Options as AcornOptions, parse, Pattern, Program, Token, tokTypes } from 'acorn';
import { escapeHtml, Language } from '@site/src/utils/Language';
import { type Geometry } from 'geos.js';


export interface FeatureVar {
    name: string;
    geom: Geometry;
}

export interface Var {
    name: string;
    value: any;
}

export interface EvalCodeResult {
    vars?: Var[];
    featureVars?: FeatureVar[];
    evalError?: Error;
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
        } catch (e: any) {
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
            const ast = (this.lastCode === code)
                ? this.lastAST!
                : parse(code, this.acornOptions);

            // get names of the variables declared in snippet 'global' scope
            const varNames: string[] = [];
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
            const vars: Var[] = [];
            const featureVars: FeatureVar[] = [];

            for (const name in result) {
                const value = result[ name ];
                if (Array.isArray(value) && value.length && value.every(window.geos.isGeometry)) {
                    for (let j = 0; j < value.length; j++) {
                        featureVars.push({ name: `${name}[${j}]`, geom: value[ j ] });
                    }
                } else if (window.geos.isGeometry(value)) {
                    featureVars.push({ name, geom: value });
                } else {
                    vars.push({ name, value });
                }
            }

            return { vars, featureVars };
        } catch (e: any) {
            return { evalError: e };
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

function getVarNamesFromPattern(pattern: Pattern, varNames: string[]): void {
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
