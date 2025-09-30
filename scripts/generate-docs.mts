import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { basename, dirname, join, relative, sep } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';


const apiSidebar: SidebarCategory[] = [
    {
        label: 'Setup',
        dir: '/setup',
        forced: new Set([ 'initializeFromBase64', 'initialize', 'terminate' ]),
    },
    {
        label: 'Input/Output',
        dir: '/io',
    },
    {
        label: 'Measurement',
        dir: '/measurement',
    },
    {
        label: 'Predicates',
        dir: '/predicates',
    },
    {
        label: 'Spatial Predicates',
        dir: '/spatial-predicates',
    },
    {
        label: 'Operations',
        dir: '/operations',
    },
    {
        label: 'Spatial Indexes',
        dir: '/spatial-indexes',
    },
    {
        label: 'Helper',
        dir: '/helpers',
    },
    {
        label: 'Other',
        dir: '/other',
        forced: new Set([ 'prepare', 'unprepare' ]),
    },
    {
        label: 'Types',
        dir: '/types',
    },
];


const externalTypeLinks: Record<string, Record<string, string>> = {
    'typescript': {
        'Uint8Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array',
        'Promise': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
        'Response': 'https://developer.mozilla.org/en-US/docs/Web/API/Response',
        'Error': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
        'WebAssembly.Module': 'https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Module',
    },
    '@types/geojson': {
        'Geometry': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1',
        'Position': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1',
        'Point': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2',
        'LineString': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.4',
        'Polygon': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6',
        'MultiPoint': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.3',
        'MultiLineString': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.5',
        'MultiPolygon': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.7',
        'GeometryCollection': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.8',
        'Feature': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.2',
        'FeatureCollection': 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.3',
    },
};


interface SidebarCategory {
    label: string;
    dir: string;
    forced?: Set<string>; // symbols forced into this category
    childPositionCounter?: number;
    children?: SidebarCategory[];
    parent?: SidebarCategory;
    linkType?: 'generated-index' | 'doc'; // 'generated-index' by default
}

namespace TS {

    export type Type =
        SimpleType |
        ThisType |
        ReferenceType |
        ArrayType | // a[][]
        UnionType | // a | b
        IntersectionType | // a & b
        ParenthesizedType | // (a)
        TypeLiteral | // { a: b }
        TupleType // [ a, b ]

    export interface SimpleType {
        type: 'simple';
        value: string;
    }

    export interface ThisType {
        type: 'this';
        value: string;
    }

    export interface ReferenceType {
        type: 'reference',
        name: string;
        refersToTypeParameter?: boolean;
        typeArguments?: Type[];
        declarationRef?: {
            package: string;
            name: string;
        };
        targetSymbol: ts.Symbol;
    }

    export interface ArrayType {
        type: 'array',
        level: number;
        elementType: Type;
    }

    export interface UnionType {
        type: 'union',
        types: Type[];
    }

    export interface IntersectionType {
        type: 'intersection',
        types: Type[];
    }

    export interface ParenthesizedType {
        type: 'parenthesized',
        body: Type;
    }

    export interface TypeLiteral {
        type: 'typeLiteral',
        members: TypeLiteralMember[];
    }

    export interface TypeLiteralMember {
        name: string;
        type: Type;
        optional: boolean;
        jsDoc: JSDoc.ParamData;
    }

    export interface TupleType {
        type: 'tuple',
        elements: TupleMember[];
    }

    export interface TupleMember {
        name: string;
        optional: boolean;
        type: Type;
    }

    /*******/

    export interface TypeParameter {
        name: string;
    }

    export interface Parameter {
        name: string;
        type: Type;
        optional: boolean;
    }

    export interface Property {
        symbol: ts.Symbol;
        name: string;
        type: Type;
        optional: boolean;
        readonly: boolean;
        jsDoc: JSDoc.Data;
    }

}

namespace JSDoc {

    export type RichTextNode =
        TextNode |
        LinkNode |
        AdmonitionNode

    export interface TextNode {
        type: 'text',
        text: string;
    }

    export interface LinkNode {
        type: 'link',
        text: string;
        target: string;
    }

    export interface AdmonitionNode {
        type: 'admonition',
        aType: 'note' | 'tip' | 'info' | 'warning' | 'danger';
        body: RichTextNode[];
    }

    export interface TypeParamData {
        name: string;
        description: RichTextNode[];
    }

    export interface ParamData {
        name: string;
        description: RichTextNode[];
        optional: boolean;
        default?: string;
    }

    export interface Example {
        title?: string;
        code: string;
        live?: string; // `live[<optional options here>]`
    }

    export interface Data {
        description: RichTextNode[];
        default?: string;
        typeParams: TypeParamData[];
        params: ParamData[];
        returns: RichTextNode[];
        throws: {
            type: string;
            description: RichTextNode[];
        }[];
        see: RichTextNode[][];
        examples: Example[];
    }

}


// @ts-ignore
global.__where__ = (node: ts.Node) => { // dev helper
    const nodes: ts.Node[] = [];
    for (let n = node; n; n = n.parent) nodes.push(n);
    const sourceFile = node.getSourceFile();
    const start = node.getStart();
    const { line: startLine, character: startCol } = ts.getLineAndCharacterOfPosition(sourceFile, start);
    const end = node.getEnd();
    const { line: endLine, character: endCol } = ts.getLineAndCharacterOfPosition(sourceFile, end);
    return {
        chain: nodes.map(n => ts.SyntaxKind[ n.kind ]),
        file: sourceFile.fileName,
        start: { line: startLine + 1, col: startCol + 1 },
        end: { line: endLine + 1, col: endCol + 1 },
    };
};


/**
 * Collects data from `./src` source files TypeScript types and JSDoc comments
 * to generate API Documentation files.
 *
 * 1. The order of categories in the docs sidebar is based on {@link apiSidebar}
 * 2. The order in which the functions will be presented in the docs is based
 *    on the order of exports in `src/index.mts`
 * 3. The category under which each function will be listed is (mostly) based
 *    on the module path (there are some special cases, like Setup functions)
 */
void async function main() {
    const ROOT_DIR = join(import.meta.dirname, '..');
    const SRC_INDEX_FILE_PATH = join(ROOT_DIR, './src/index.mts');
    const DOCS_DIR = join(ROOT_DIR, './docs');
    const DOCS_API_DIR = join(DOCS_DIR, './docs/api');

    const sha = execSync(`git -C ${ROOT_DIR} rev-parse --verify HEAD`, { encoding: 'utf8' }).trim();
    const EDIT_BASE_URL = `https://github.com/kajkal/geos.js/blob/${sha.slice(0, 7)}`;

    /** Process source files */
    const program = ts.createProgram([ SRC_INDEX_FILE_PATH ], {});
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(SRC_INDEX_FILE_PATH)!;
    assert.ok(sourceFile);


    function processTypeNode(typeNode: ts.TypeNode | undefined): TS.Type {
        assert.ok(typeNode);
        switch (typeNode.kind) {
            case ts.SyntaxKind.BooleanKeyword:
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.StringKeyword:
            case ts.SyntaxKind.ObjectKeyword:
            case ts.SyntaxKind.VoidKeyword:
            case ts.SyntaxKind.NeverKeyword:
            case ts.SyntaxKind.UndefinedKeyword:
            case ts.SyntaxKind.UnknownKeyword:
            case ts.SyntaxKind.LiteralType: {
                return { type: 'simple', value: typeNode.getText() };
            }
            case ts.SyntaxKind.TypePredicate: {
                assert.ok(ts.isTypePredicateNode(typeNode));
                assert.ok(!typeNode.assertsModifier);
                return { type: 'simple', value: 'boolean' };
            }
            case ts.SyntaxKind.ThisType: {
                assert.ok(ts.isThisTypeNode(typeNode));
                return { type: 'this', value: typeNode.getText() };
            }
            case ts.SyntaxKind.TypeReference: {
                assert.ok(ts.isTypeReferenceNode(typeNode));
                let externalDeclarationRef: TS.ReferenceType['declarationRef'] | undefined;
                const type = checker.getTypeFromTypeNode(typeNode);
                const symbol = type.aliasSymbol ?? type.getSymbol()!;
                const declaration = symbol.getDeclarations()![ 0 ];
                const pathParts = relative(ROOT_DIR, declaration.getSourceFile().fileName).split(sep);
                for (let i = pathParts.length - 1; i > 0; i--) {
                    if (pathParts[ i - 1 ] === 'node_modules') {
                        externalDeclarationRef = {
                            package: pathParts[ i ].startsWith('@')
                                ? `${pathParts[ i ]}/${pathParts[ i + 1 ]}` // packageScope/packageName
                                : pathParts[ i ], // packageName
                            name: checker.getFullyQualifiedName(symbol).replace(/^".+?"\./, ''),
                        };
                        break;
                    }
                }
                return {
                    type: 'reference',
                    name: typeNode.typeName.getText(),
                    typeArguments: typeNode.typeArguments?.map(processTypeNode),
                    refersToTypeParameter: Boolean(type.flags & ts.TypeFlags.TypeParameter),
                    declarationRef: externalDeclarationRef,
                    targetSymbol: symbol,
                };
            }
            case ts.SyntaxKind.ArrayType: {
                assert.ok(ts.isArrayTypeNode(typeNode));
                let level = 0;
                for (; ts.isArrayTypeNode(typeNode); typeNode = typeNode.elementType) level++;
                return {
                    type: 'array',
                    level,
                    elementType: processTypeNode(typeNode),
                };
            }
            case ts.SyntaxKind.UnionType: {
                assert.ok(ts.isUnionTypeNode(typeNode));
                return {
                    type: 'union',
                    types: typeNode.types.map(processTypeNode),
                };
            }
            case ts.SyntaxKind.IntersectionType: {
                assert.ok(ts.isIntersectionTypeNode(typeNode));
                return {
                    type: 'intersection',
                    types: typeNode.types.map(processTypeNode),
                };
            }
            case ts.SyntaxKind.ParenthesizedType: {
                assert.ok(ts.isParenthesizedTypeNode(typeNode));
                return {
                    type: 'parenthesized',
                    body: processTypeNode(typeNode.type),
                };
            }
            case ts.SyntaxKind.TypeLiteral: {
                assert.ok(ts.isTypeLiteralNode(typeNode));
                return {
                    type: 'typeLiteral',
                    members: typeNode.members.map(node => {
                        assert.ok(ts.isPropertySignature(node));
                        return {
                            name: node.name.getText(),
                            optional: Boolean(node.questionToken),
                            type: processTypeNode(node.type),
                            jsDoc: null!,
                        };
                    }),
                };
            }
            case ts.SyntaxKind.TupleType: {
                assert.ok(ts.isTupleTypeNode(typeNode));
                return {
                    type: 'tuple',
                    elements: typeNode.elements.map(node => {
                        assert.ok(ts.isNamedTupleMember(node));
                        assert.ok(!node.dotDotDotToken);
                        return {
                            name: node.name.getText(),
                            optional: Boolean(node.questionToken),
                            type: processTypeNode(node.type),
                        };
                    }),
                };
            }
            default: {
                throw new Error(`Unexpected node type '${ts.SyntaxKind[ typeNode.kind ]}'`);
            }
        }
    }

    function processTypeParameter(node: ts.TypeParameterDeclaration): TS.TypeParameter {
        return {
            name: node.name.getText(),
        };
    }

    function processParameter(node: ts.ParameterDeclaration): TS.Parameter {
        return {
            name: node.name.getText(),
            type: processTypeNode(node.type),
            optional: Boolean(node.questionToken),
        };
    }

    function processProperty(node: ts.PropertyDeclaration | ts.PropertySignature): TS.Property {
        const symbol = checker.getSymbolAtLocation(node.name);
        assert.ok(symbol);
        return {
            symbol,
            name: node.name.getText(),
            type: processTypeNode(node.type),
            optional: Boolean(node.questionToken),
            readonly: Boolean(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword)),
            jsDoc: processJsDoc(node),
        };
    }


    function processJsDocRichText(nodeOrNodes: undefined | string | ts.NodeArray<ts.JSDocComment>): JSDoc.RichTextNode[] {
        let nodes: (JSDoc.TextNode | JSDoc.LinkNode)[] = [];
        if (typeof nodeOrNodes === 'string') {
            nodes.push({ type: 'text', text: nodeOrNodes });
        } else {
            for (const node of nodeOrNodes || []) {
                switch (node.kind) {
                    case ts.SyntaxKind.JSDocText: {
                        if ((node as ts.JSDocText).text) {
                            nodes.push({ type: 'text', text: node.text });
                        }
                        break;
                    }
                    case ts.SyntaxKind.JSDocLink: {
                        const [ _, target, text ] = node.getText().match(/^\{@link (.+?)(?:\s*\|\s*(.+))?}$/)!;
                        const prevNode = nodes.at(-1);
                        if (!text && prevNode?.type === 'text') {
                            const linkTextMatch = prevNode.text.match(/\[([^\[]+)]$/);
                            if (linkTextMatch) {
                                if (linkTextMatch.index) { // there is something beside `[link text]` in the prev text node
                                    prevNode.text = prevNode.text.slice(0, linkTextMatch.index);
                                    nodes.push({ type: 'link', text: linkTextMatch[ 1 ], target });
                                } else {
                                    nodes[ nodes.length - 1 ] = { type: 'link', text: linkTextMatch[ 1 ], target };
                                }
                                continue;
                            }
                        }
                        nodes.push({ type: 'link', text: text || target, target });
                        break;
                    }
                    default: {
                        throw new Error(`Unexpected node kind: ${ts.SyntaxKind[ node.kind ]}`);
                    }
                }
            }
        }

        // extract admonitions blocks:
        let admonition: JSDoc.AdmonitionNode | null = null;
        return nodes
            .flatMap<JSDoc.TextNode | JSDoc.LinkNode>(node => (
                node.type === 'text'
                    ? node.text
                        .split(/\r?\n/)
                        .map((t, i) => ({ type: 'text', text: i ? `\n${t}` : t }))
                    : node
            ))
            .reduce<JSDoc.RichTextNode[]>((acc, node) => {
                if (node.type === 'text') {
                    const admonitionStartMatch = node.text.match(/^\n?(Note|Tip|Info|Warning|Danger):$/);
                    if (admonitionStartMatch) {
                        admonition = {
                            type: 'admonition',
                            aType: admonitionStartMatch[ 1 ].toLowerCase() as JSDoc.AdmonitionNode['aType'],
                            body: [],
                        };
                        return [ ...acc, admonition ];
                    }
                }
                if (admonition) {
                    if (node.text.startsWith('\n') && node.text !== '\n') {
                        if (!node.text.startsWith('\n  ')) {
                            admonition = null;
                            return [ ...acc, node ];
                        }
                        node = { ...node, text: node.text.replace('\n  ', '\n') };
                    }
                    admonition.body.push(node);
                    return acc;
                }
                return [ ...acc, node ];
            }, []);
    }

    function processJsDoc(node: ts.Node): JSDoc.Data {
        const data: JSDoc.Data = {
            description: [],
            default: undefined!,
            typeParams: [],
            params: [],
            returns: [],
            throws: [],
            see: [],
            examples: [],
        };

        const docs = ts.getJSDocCommentsAndTags(node);
        if (!docs.length) {
            return data;
        }

        const doc = docs.at(-1);
        assert.ok(ts.isJSDoc(doc!));
        if (doc.comment) {
            data.description = processJsDocRichText(doc.comment);
        }
        for (const tag of doc.tags || []) {
            switch (tag.kind) {
                case ts.SyntaxKind.JSDocTemplateTag: {
                    assert.ok(ts.isJSDocTemplateTag(tag));
                    assert.equal(tag.typeParameters.length, 1);
                    data.typeParams.push({
                        name: tag.typeParameters[ 0 ].name.getText(),
                        description: processJsDocRichText(tag.comment),
                    });
                    break;
                }
                case ts.SyntaxKind.JSDocParameterTag: {
                    assert.ok(ts.isJSDocParameterTag(tag));
                    assert.ok(!tag.typeExpression); // no type in param tag
                    const paramName = tag.name.getText();
                    const fullText = tag.getFullText().replace(/^@param /, '');
                    const optional = fullText.startsWith('[');
                    let defaultValue: string;
                    if (optional) {
                        const match = fullText.match(new RegExp(`^\\[${paramName}=(.+?)] - `));
                        if (match) {
                            defaultValue = match[ 1 ];
                        } else {
                            assert.ok(fullText.startsWith(`[${paramName}] - `));
                        }
                    } else {
                        assert.ok(fullText.startsWith(`${paramName} - `));
                    }
                    data.params.push({
                        name: paramName,
                        description: processJsDocRichText(tag.comment),
                        optional,
                        default: defaultValue!,
                    });
                    break;
                }
                case ts.SyntaxKind.JSDocReturnTag: {
                    assert.ok(ts.isJSDocReturnTag(tag));
                    assert.ok(!tag.typeExpression); // no type in return tag
                    assert.ok(!data.returns.length);
                    data.returns = processJsDocRichText(tag.comment);
                    break;
                }
                case ts.SyntaxKind.JSDocThrowsTag: {
                    assert.ok(ts.isJSDocThrowsTag(tag));
                    assert.ok(tag.typeExpression);
                    const errorClass = tag.typeExpression.getText(); // requires `@throws {ErrorClass} ` format
                    assert.match(errorClass, /^\{\w+}$/);
                    data.throws.push({
                        type: errorClass.slice(1, -1),
                        description: processJsDocRichText(tag.comment),
                    });
                    break;
                }
                case ts.SyntaxKind.JSDocSeeTag: {
                    assert.ok(ts.isJSDocSeeTag(tag));
                    data.see.push(processJsDocRichText(tag.comment));
                    break;
                }
                default: {
                    assert.equal(tag.kind, ts.SyntaxKind.FirstJSDocTagNode);
                    const tagName = tag.tagName.text;
                    switch (tagName) {
                        case 'default': {
                            assert.ok(!data.default);
                            assert.ok(typeof tag.comment === 'string');
                            data.default = tag.comment;
                            break;
                        }
                        case 'example': {
                            let live: string | undefined = undefined;
                            let [ header, ...lines ] = tag.getFullText()
                                .split(/\r?\n/)
                                .map(l => l.replace(/^\s*\*(?: |$)/, ''));
                            header = header.replace(/^@example\s*/, '');
                            header = header.replace(/^#(live(?:\[.*?])?)\s*/, (_, match) => (live = match, ''));
                            if (live) {
                                assert.match(live, /^live(?:\[(v,?)?(d,?)?])?$/);
                            }
                            data.examples.push({
                                title: header,
                                code: lines.join('\n').trim(),
                                live,
                            });
                            break;
                        }
                        default: {
                            throw new Error(`Unexpected tag [ kind=${ts.SyntaxKind[ tag.kind ]}, name='${tagName}' ]`);
                        }
                    }
                }
            }
        }
        return data;
    }


    abstract class BaseSymbol {

        name: string;
        symbol: ts.Symbol;
        usages: ts.Node[] = [];

        docFile: {
            category: SidebarCategory;
            path: string;
            id?: string;
        };

        editUrl: string; // url to src file

        constructor(symbol: ts.Symbol) {
            this.symbol = symbol;
            assert.ok(!(symbol.flags & ts.SymbolFlags.Alias)); // not an alias
            const sources = symbol.getDeclarations()!
                .map(declaration => {
                    const sourceFile = declaration.getSourceFile();
                    const start = declaration.getStart(sourceFile, true);
                    const { line: startLine } = ts.getLineAndCharacterOfPosition(sourceFile, start);
                    const end = declaration.getEnd();
                    const { line: endLine } = ts.getLineAndCharacterOfPosition(sourceFile, end);
                    return {
                        path: relative(ROOT_DIR, sourceFile.fileName).replaceAll(sep, '/'),
                        start: startLine + 1, // 0-based to 1-based
                        end: endLine + 1,
                    };
                });
            const { path, start, end } = sources.reduce((acc, src) => {
                assert.equal(acc.path, src.path);
                assert.equal(acc.end, src.start - 1); // assert that ranges are adjacent
                return { ...acc, end: src.end };
            });
            const lines = start === end ? `L${start}` : `L${start}-L${end}`;
            this.editUrl = `${EDIT_BASE_URL}/${path}#${lines}`;
        }

        clearUsagesBySymbol(usageSymbol: ts.Symbol) {
            const declarations: ts.Node[] = usageSymbol.getDeclarations()!;
            assert.ok(declarations);

            const prevNodes = this.usages;
            const nextNodes = prevNodes
                .filter(node => {
                    for (let n = node; n; n = n.parent) {
                        if (declarations.includes(n)) return false;
                    }
                    return true;
                });

            // const removedNodes = prevNodes
            //     .filter(node => !nextNodes.includes(node))
            //     .map(global.__where__);

            this.usages = nextNodes;
        }

        isAlreadyInlined() {
            // some interfaces and types are inlined in relevant parts of documentation
            // do not add them as independent entries

            const publicNodes = this.usages
                .filter(node => {
                    const nodes: ts.Node[] = [];
                    for (let n = node; n; n = n.parent) nodes.push(n);

                    // ignore parts of 'internal' API
                    if (nodes.some(n => ts.getJSDocTags(n).some(t => t.tagName.text === 'internal'))) {
                        return;
                    }

                    // ignore function body
                    const block = nodes.findLast(n => n.kind === ts.SyntaxKind.Block);
                    if (block) {
                        assert.ok(ts.isFunctionDeclaration(block.parent) || ts.isArrowFunction(block.parent));
                        return;
                    }

                    // keep parts of public API
                    const topNode = nodes.at(-2);
                    assert.ok(topNode);
                    let topNodeSymbol: ts.Symbol | undefined;
                    if (ts.isDeclarationStatement(topNode)) {
                        assert.ok(topNode.name);
                        topNodeSymbol = checker.getSymbolAtLocation(topNode.name);
                        assert.ok(topNodeSymbol && topNodeSymbol.declarations);

                        // ignore overloads
                        if (topNodeSymbol.declarations.length > 1) {
                            const isMainDeclaration = topNodeSymbol.declarations.at(-1) === topNode;
                            if (!isMainDeclaration) {
                                return;
                            }
                        }

                        // ignore when part of already inlined interface
                        if (topNodeSymbol.declarations.length === 1 && topNodeSymbol.declarations[ 0 ] === topNode) {
                            if (ts.isInterfaceDeclaration(topNode)) {
                                if (
                                    ts.isIdentifier(node) &&
                                    ts.isExpressionWithTypeArguments(node.parent) &&
                                    ts.isHeritageClause(node.parent.parent) &&
                                    node.parent.parent.parent === topNode
                                ) { // node is B in `interface A extends B {}`
                                    const match = symbolMap.getBySymbol(topNodeSymbol);
                                    if (match && match instanceof BaseSymbol && match.isAlreadyInlined()) {
                                        return;
                                    }
                                }
                            }
                        }
                    } else {
                        // arrow function declaration
                        assert.ok(ts.isVariableStatement(topNode));
                        for (const declaration of topNode.declarationList.declarations) {
                            if (ts.isVariableDeclaration(declaration) && declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
                                topNodeSymbol = declaration.name && checker.getSymbolAtLocation(declaration.name);
                                break;
                            }
                        }
                    }
                    const match = topNodeSymbol && symbolMap.getBySymbol(topNodeSymbol);
                    return match && 'kind' in match;
                });

            const omitThisSymbol = publicNodes.every(node => ts.isDeclarationStatement(node.parent));
            if (omitThisSymbol) {
                console.debug(`skip '${this.name}' - already inlined`);
            }
            return omitThisSymbol;
        }

    }

    class FunctionSymbol extends BaseSymbol {

        readonly kind = 'function';

        parent?: ClassLikeSymbol; // when function is a method
        typeParams?: TS.TypeParameter[];
        params: TS.Parameter[];
        returns: TS.Type;
        jsDoc: JSDoc.Data;

        constructor(symbol: ts.Symbol, node?: ts.SignatureDeclarationBase) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations()!;
                assert.ok(declarations.length >= 1);
                const overloads = declarations.map(declaration => {
                    assert.ok(ts.isFunctionDeclaration(declaration));
                    return new FunctionSymbol(symbol, declaration);
                });
                const data = overloads.at(-1)!;
                data.jsDoc = overloads[ 0 ].jsDoc;
                return data;
            }

            this.name = node.name!.getText();
            this.typeParams = node.typeParameters?.map(processTypeParameter);
            this.params = node.parameters.map(processParameter);
            this.returns = processTypeNode(node.type);
            this.jsDoc = processJsDoc(node);
        }

    }

    class ClassLikeSymbol extends BaseSymbol {

        static ErrorClassSymbol: ts.Symbol;
        static {
            const errorSymbol = checker.resolveName('Error', undefined, ts.SymbolFlags.All, false);
            assert.ok(errorSymbol);
            this.ErrorClassSymbol = errorSymbol;
        }

        static isErrorClassSymbol(classSymbol: ts.Symbol) {
            return classSymbol === ClassLikeSymbol.ErrorClassSymbol;
        }

        readonly kind: 'class' | 'interface';

        prototypeChain: ts.Symbol[] = []; // flatten, not ideal but good enough
        typeParams?: TS.TypeParameter[];
        properties: TS.Property[] = [];
        methods: FunctionSymbol[] = [];
        jsDoc: JSDoc.Data;

        constructor(kind: 'class' | 'interface', symbol: ts.Symbol, node?: ts.ClassDeclaration | ts.InterfaceDeclaration) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations()!;
                assert.equal(declarations.length, 1);
                if (kind === 'class') {
                    assert.ok(ts.isClassDeclaration(declarations[ 0 ]));
                } else {
                    assert.ok(ts.isInterfaceDeclaration(declarations[ 0 ]));
                }
                return new ClassLikeSymbol(kind, symbol, declarations[ 0 ]);
            }

            this.name = node.name!.text;
            this.kind = kind;
            this.jsDoc = processJsDoc(node);

            for (let n: ts.ClassDeclaration | ts.InterfaceDeclaration | undefined = node; n?.heritageClauses;) {
                assert.equal(n.heritageClauses.length, 1);
                const clause: ts.HeritageClause = n.heritageClauses[ 0 ];
                for (const type of clause.types) {
                    let symbol = checker.getSymbolAtLocation(type.expression);
                    assert.ok(symbol);
                    if (symbol.flags & ts.SymbolFlags.Alias) {
                        symbol = checker.getAliasedSymbol(symbol);
                    }
                    assert.ok(symbol);
                    this.prototypeChain.push(symbol);
                    if (symbol.flags & ts.SymbolFlags.Class || symbol.flags & ts.SymbolFlags.Interface) {
                        n = symbol.getDeclarations()!.find(ts.isClassDeclaration);
                    } else { // verify that this is a build-in class
                        assert.ok(symbol.flags & ts.SymbolFlags.FunctionScopedVariable);
                        assert.ok(symbol.flags & ts.SymbolFlags.Interface);
                        assert.ok(!(symbol as any)[ 'parent' ]);
                        break;
                    }
                }
            }

            this.typeParams = node.typeParameters?.map(processTypeParameter);

            for (const memberNode of node.members) {
                const isInternal = ts.getJSDocTags(memberNode).some(tag => tag.tagName.getText() === 'internal');
                if (isInternal) continue;
                if (ts.isPropertyDeclaration(memberNode) || ts.isPropertySignature(memberNode)) {
                    assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static property
                    this.properties.push(processProperty(memberNode));
                } else if (ts.isMethodDeclaration(memberNode) || ts.isMethodSignature(memberNode)) {
                    assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static method
                    this.methods.push(new FunctionSymbol(checker.getSymbolAtLocation(memberNode.name)!, memberNode));
                } else {
                    throw new Error(`Unexpected node kind: ${ts.SyntaxKind[ memberNode.kind ]}`);
                }
            }
        }

    }

    class TypeSymbol extends BaseSymbol {

        readonly kind = 'type';

        definition: TS.Type;
        typeParams?: TS.TypeParameter[];
        jsDoc: JSDoc.Data;

        simple: boolean; // simple types can be inlined

        constructor(symbol: ts.Symbol, node?: ts.TypeAliasDeclaration) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations()!;
                assert.equal(declarations.length, 1);
                assert.ok(ts.isTypeAliasDeclaration(declarations[ 0 ]));
                return new TypeSymbol(symbol, declarations[ 0 ]);
            }

            this.name = node.name.text;
            this.definition = processTypeNode(node.type);
            this.typeParams = node.typeParameters?.map(processTypeParameter);
            this.jsDoc = processJsDoc(node);

            const t = this.definition;
            this.simple =
                t.type === 'simple' ||
                (t.type === 'union' && t.types.every(t => t.type === 'simple'));
        }

    }


    type ExportedSymbol = FunctionSymbol | ClassLikeSymbol | TypeSymbol;

    const symbolMap = new class {

        symbols = new Map<ts.Symbol, ExportedSymbol | { usages: ts.Node[] }>();
        symbolsByName = new Map<string, ExportedSymbol>(); // exported symbols from index.mts

        constructor() {
            /** Collect all symbol usages */
            for (const sourceFile of program.getSourceFiles()) {
                if (!sourceFile.isDeclarationFile) {
                    ts.forEachChild(sourceFile, node => this.visitNode(node));
                }
            }
        }

        visitNode(node: ts.Node) {
            let symbol = checker.getSymbolAtLocation(node);
            if (symbol) {
                if (symbol.flags & ts.SymbolFlags.Alias) {
                    symbol = checker.getAliasedSymbol(symbol); // resolve import aliases
                }
                assert.ok(node.parent);
                if (
                    !ts.isExportSpecifier(node.parent) && !ts.isExportDeclaration(node.parent) &&
                    !ts.isImportSpecifier(node.parent) && !ts.isImportDeclaration(node.parent)
                ) {
                    const value = this.symbols.get(symbol) || { usages: [] };
                    value.usages.push(node);
                    this.symbols.set(symbol, value);
                }
            }
            ts.forEachChild(node, node => this.visitNode(node));
        }

        visitExportedSymbol(symbol: ts.Symbol, data: ExportedSymbol) {
            const match = this.getBySymbol(symbol);
            assert.ok(match);
            assert.equal(Object.keys(match).join(), 'usages');
            assert.equal(data.usages.length, 0);
            data.usages = match.usages;
            this.symbols.set(symbol, data);
            this.symbolsByName.set(data.name, data);
        }

        * exportedSymbols() {
            yield* this.symbolsByName.values();
        }


        getBySymbol(symbol: ts.Symbol): ExportedSymbol | { usages: ts.Node[] } | undefined {
            return this.symbols.get(symbol);
        }

        getByName(name: string): ExportedSymbol | undefined {
            return this.symbolsByName.get(name);
        }


        relativeURL(source: BaseSymbol, target: BaseSymbol, id = target.docFile.id) {
            const relativePath = relative(dirname(source.docFile.path), target.docFile.path).replaceAll(sep, '/');
            return `${relativePath}${id ? `#${id}` : ''}`;
        };

        resolveSymbolLink(source: BaseSymbol, target: ts.Symbol | string, text?: string): { label: string, target: string } {
            if (typeof target === 'string') {
                const match = this.getByName(target);
                if (match && 'docFile' in match) {
                    return { label: target, target: this.relativeURL(source, match) };
                }
                const buildInUrl = externalTypeLinks[ 'typescript' ][ target ];
                if (buildInUrl) {
                    return { label: target, target: buildInUrl };
                }
                throw new Error(`unresolved symbol '${target}'`);
            }
            const match = this.getBySymbol(target);
            if (match && 'docFile' in match) {
                assert.ok(text);
                return { label: text, target: this.relativeURL(source, match) };
            }
            throw new Error(`unresolved symbol '${target.getName()}'`);
        }

        createLink(source: BaseSymbol, target: string, text: string): string {
            if (target.startsWith('https://')) {
                return `[${text}](${target})`;
            }
            const linkLabel = text === target ? `\`${text}\`` : text;
            let match = this.getByName(target);
            if (match) {
                return `[${linkLabel}](${this.relativeURL(source, match)})`;
            }
            // to handle syntax `Geometry#toJSON`
            const [ targetClass, targetMember ] = target.split('#');
            const matchByClass = this.getByName(targetClass);
            if (matchByClass) {
                assert.equal(matchByClass.kind, 'class');
                const matchingMethod = matchByClass.methods.find(m => m.name === targetMember);
                if (matchingMethod) {
                    return `[${linkLabel}](${this.relativeURL(source, matchingMethod)})`;
                } else {
                    const matchingProperty = matchByClass.properties.find(m => m.name === targetMember);
                    if (matchingProperty) {
                        return `[${linkLabel}](${this.relativeURL(source, matchByClass, targetMember)})`;
                    }
                }
            }
            return `[${linkLabel}](${target})`;
        }

    }();


    /** Collect exported symbols from `index.mts` */
    ts.forEachChild(sourceFile, (node) => {
        if (!ts.isExportDeclaration(node)) return; // get only exports from `index.mts`

        assert.ok(ts.isNamedExports(node.exportClause!));
        let symbolsToProcess: ts.Symbol[];
        let path: string;

        if (node.moduleSpecifier) {
            // exports/imports from another module
            assert.ok(ts.isStringLiteral(node.moduleSpecifier));
            path = node.moduleSpecifier.text; // eg './io/wkt.mjs'
            const symbol = checker.getSymbolAtLocation(node.moduleSpecifier)!;
            symbolsToProcess = node.exportClause.elements.map(es => {
                return checker.tryGetMemberInModuleExports(es.name.text, symbol)!;
            });
        } else {
            // exports from index.mts itself
            path = './' + basename(sourceFile.fileName);
            symbolsToProcess = node.exportClause.elements.map(es => {
                const symbol = checker.getSymbolAtLocation(es.propertyName || es.name)!;
                assert.ok(symbol.flags & ts.SymbolFlags.Alias); // is re-export
                return checker.getAliasedSymbol(symbol);
            });
        }

        for (const symbol of symbolsToProcess) {
            const name = symbol.name;
            let data: ExportedSymbol;

            switch (symbol.flags) {
                case ts.SymbolFlags.Function: {
                    const dirPath = dirname(path); // eg './io'
                    const category = apiSidebar.find(c => c.forced?.has(name))
                        || apiSidebar.find(c => `.${c.dir}` === dirPath);
                    assert.ok(category, `Sidebar category for '${path}' is not defined`);

                    data = new FunctionSymbol(symbol);
                    data.docFile = {
                        category,
                        path: join(category.dir, `${name}.mdx`),
                    };
                    break;
                }
                case ts.SymbolFlags.Class: {
                    const category = apiSidebar.find(c => c.dir === '/types');
                    assert.ok(category);

                    data = new ClassLikeSymbol('class', symbol);
                    if (data.prototypeChain.some(ClassLikeSymbol.isErrorClassSymbol)) {
                        assert.equal(data.methods.length, 0);
                        data.docFile = {
                            category,
                            path: join(category.dir, 'errors.mdx'),
                            id: name,
                        };
                    } else {
                        const subCategory: SidebarCategory = {
                            label: name,
                            dir: join(category.dir, name),
                            parent: category,
                            linkType: 'doc',
                        };
                        category.children ??= [];
                        category.children.push(subCategory);
                        for (const methodData of data.methods) {
                            methodData.parent = data;
                            methodData.docFile = {
                                category: subCategory,
                                path: join(subCategory.dir, `${methodData.name}.mdx`),
                            };
                        }
                        data.docFile = {
                            category: subCategory,
                            path: join(subCategory.dir, 'index.mdx'),
                        };
                    }
                    break;
                }
                case ts.SymbolFlags.Interface: {
                    const category = apiSidebar.find(c => c.dir === '/types');
                    assert.ok(category);

                    data = new ClassLikeSymbol('interface', symbol);
                    data.docFile = {
                        category,
                        path: join(category.dir, 'types.mdx'),
                        id: name,
                    };
                    break;
                }
                // case ts.SymbolFlags.Class | ts.SymbolFlags.Interface: { // Declaration Merging
                //     assert.ok(declarations.length > 1);
                //     break;
                // }
                case ts.SymbolFlags.TypeAlias: {
                    const category = apiSidebar.find(c => c.dir === '/types');
                    assert.ok(category);

                    data = new TypeSymbol(symbol);
                    data.docFile = {
                        category,
                        path: join(category.dir, 'types.mdx'),
                        id: name,
                    };
                    break;
                }
                default: {
                    throw new Error(`Unexpected symbol flags ${symbol.flags}`);
                }
            }

            symbolMap.visitExportedSymbol(symbol, data);
        }
    });


    class DocumentationWriter {

        symbol: ExportedSymbol;
        lines: string[] = [];

        constructor(symbol: ExportedSymbol) {
            this.symbol = symbol;
        }

        formatRichText(textNodes: JSDoc.RichTextNode[]): string {
            return textNodes
                .map(node => {
                    switch (node.type) {
                        case 'text':
                            return node.text;
                        case 'link':
                            return symbolMap.createLink(this.symbol, node.target, node.text);
                        case 'admonition': {
                            return `\n:::${node.aType}\n\n${this.formatRichText(node.body).trim()}\n\n:::\n`;
                        }
                    }
                })
                .join('');
        }

        formatType(type: TS.Type, wrapper = (code: string) => code): string {
            switch (type.type) {
                case 'simple': {
                    return wrapper(`**${type.value}**`);
                }
                case 'this': {
                    let linkTarget: string;
                    if (this.symbol.kind === 'class') {
                        linkTarget = symbolMap.relativeURL(this.symbol, this.symbol); // ref to the current page
                    } else if (this.symbol.kind === 'function') {
                        assert.ok(this.symbol.parent);
                        linkTarget = symbolMap.relativeURL(this.symbol, this.symbol.parent); // ref to parent
                    } else {
                        throw new Error(`unexpected symbol ${this.symbol.kind}`);
                    }
                    return wrapper(`[**this**](${linkTarget})`);
                }
                case 'reference': {
                    if (type.refersToTypeParameter) {
                        let linkTarget: string;
                        if (this.symbol.kind === 'function' && this.symbol.parent) {
                            const id = `${this.symbol.parent.name}:${type.name}`;
                            linkTarget = symbolMap.relativeURL(this.symbol, this.symbol.parent, id); // ref to parent
                        } else {
                            linkTarget = `#${this.symbol.name}:${type.name}`; // local ref
                        }
                        return wrapper(`[<span className='type-parameter'>${type.name}</span>](${linkTarget})`);
                    }
                    let name: string;
                    if (type.declarationRef) {
                        // @ts-ignore
                        const href = externalTypeLinks[ type.declarationRef.package ]?.[ type.declarationRef.name ];
                        assert.ok(href);
                        name = `[**${type.name}**](${href})`;
                    } else {
                        const match = symbolMap.getBySymbol(type.targetSymbol);
                        if (match && 'simple' in match && match.simple) {
                            return wrapper(this.formatType(match.definition)); // inline simple type refs
                        }
                        const link = symbolMap.resolveSymbolLink(this.symbol, type.targetSymbol, type.name);
                        name = `[**${link.label}**](${link.target})`;
                    }
                    if (type.typeArguments?.length) {
                        return wrapper(`${name}\\<${type.typeArguments.map(t => this.formatType(t)).join(', ')}\\>`);
                    }
                    return wrapper(name);
                }
                case 'array': {
                    return wrapper(this.formatType(type.elementType) + `${'[]'.repeat(type.level)}`);
                }
                case 'union': {
                    return type.types
                        .map(t => wrapper(this.formatType(t)))
                        .join(' \\| ');
                }
                case 'intersection': {
                    return type.types
                        .map(t => wrapper(this.formatType(t)))
                        .join(' & ');
                }
                case 'parenthesized': {
                    return wrapper(`( ${this.formatType(type.body)} )`);
                }
                case 'typeLiteral': {
                    const body = type.members
                        .map(m => `${m.name.replace(/(_)/g, '\\$1')}${m.optional ? '?' : ''}: ${this.formatType(m.type)}`)
                        .join(', ');
                    return wrapper(`\\{ ${body} }`);
                }
                case 'tuple': {
                    const body = type.elements
                        .map(e => this.formatType(e.type))
                        .join(', ');
                    return wrapper(`[ ${body} ]`);
                }
            }
            throw new Error(`unexpected type '${JSON.stringify(type)}'`);
        }

        asBeefyCode(code: string) {
            return `<code className='beefy-code'>${code}</code>`;
        }

        writeHeader(data: ExportedSymbol) {
            this.lines.push(`# ${data.name}`, '');
        }

        writeDescription(data: { jsDoc: JSDoc.Data }) {
            const description = data.jsDoc.description;
            if (!description.length) return;

            this.lines.push(this.formatRichText(description), '');
        }

        writeTypeParameters(data: TypeSymbol | FunctionSymbol | ClassLikeSymbol, options: { heading: null | '##' | '###' }) {
            const { name, typeParams, jsDoc } = data;
            if (!typeParams?.length) return;

            if (options.heading) {
                this.lines.push(`${options.heading} Type Parameters`, '');
            }
            for (const typeParam of typeParams) {
                const jsDocData = jsDoc.typeParams.find(tp => tp.name === typeParam.name);
                const id = `${name}:${typeParam.name}`;
                this.lines.push(`- <code id='${id}' className='beefy-code type-parameter'>${typeParam.name}</code>${jsDocData ? ' ' + this.formatRichText(jsDocData.description) : ''}`, '');
            }
        }

        parametersTableColumns = [
            {
                header: 'Name',
                format: '---',
                toCell: (tsData: TS.Parameter, _jsDocData: Pick<JSDoc.ParamData, never>) => {
                    return `\`${tsData.name}${tsData.optional ? '?' : ''}\``;
                },
            },
            {
                header: 'Type',
                format: ':-:',
                toCell: (tsData: TS.Parameter, _jsDocData: Pick<JSDoc.ParamData, never>) => {
                    return this.formatType(tsData.type, this.asBeefyCode);
                },
            },
            {
                header: 'Default',
                format: ':-:',
                toCell: (_tsData: TS.Parameter, jsDocData: Pick<JSDoc.ParamData, 'default'>) => {
                    return jsDocData.default && `\`${jsDocData.default}\``;
                },
            },
            {
                header: 'Description',
                format: '---',
                toCell: (_tsData: TS.Parameter, jsDocData: Pick<JSDoc.ParamData, 'description'>) => {
                    const desc = jsDocData?.description;
                    if (!desc?.length) return '';

                    let listMode = false;
                    const lines = this.formatRichText(desc)
                        .replace(/^[\s-]*/, '') // remove '- ' from the beginning
                        .split(/\r?\n/)
                        .map(line => line.replace(/\\$/, '<br/>'))
                        .map(line => {
                            if (listMode) {
                                if (line.startsWith('- ')) {
                                    // close prev bullet and start new
                                    return `</li><li>${line.slice(2)}`;
                                }
                                if (!line) {
                                    listMode = false;
                                    // close prev bullet and list
                                    return `</li></ul>`;
                                }
                                // continue an active bullet
                                return line;
                            }
                            if (line.startsWith('- ')) {
                                listMode = true;
                                // open a new bullet
                                return `<ul><li>${line.slice(2)}`;
                            }
                            return line || '<br/>';
                        });
                    if (listMode) {
                        lines.push(`</li></ul>`);
                    }
                    return lines.join(' ');
                },
            },
        ];

        writeParameters(data: FunctionSymbol, options: { heading: '##' | '###' }) {
            const { symbol: { symbol: fnSymbol } } = this;
            const { name, params, jsDoc } = data;
            if (!params.length) return;

            // if some parameter is object, extract parameters from that object
            const expandedObjectParams = params.map(param => {
                const inlinedProperties = new Map<string, TS.Property | TS.TypeLiteralMember>();
                const types = param.type.type === 'union' ? param.type.types : [ param.type ];
                // to get properties from 'options' interface
                if (types.every(t => t.type === 'reference')) {
                    const refs = types.map(t => symbolMap.getBySymbol(t.targetSymbol));
                    if (refs.every(r => r && 'kind' in r && r.kind === 'interface')) {
                        const addInlinedPropertiesFromInterface = (optionsInterface: ClassLikeSymbol) => {
                            assert.ok(!optionsInterface.methods.length);
                            for (const propData of optionsInterface.properties) {
                                inlinedProperties.set(propData.name, propData);
                            }
                        };
                        for (const referencedInterface of refs as ClassLikeSymbol[]) {
                            referencedInterface.clearUsagesBySymbol(fnSymbol);
                            for (const parentClass of referencedInterface.prototypeChain) {
                                const parent = symbolMap.getBySymbol(parentClass);
                                assert.ok(parent && parent instanceof ClassLikeSymbol);
                                parent.clearUsagesBySymbol(referencedInterface.symbol);
                                addInlinedPropertiesFromInterface(parent);
                            }
                            addInlinedPropertiesFromInterface(referencedInterface);
                        }
                    }
                }
                // to get properties from inlined objects (object literal)
                if (types.every(t => t.type === 'typeLiteral')) {
                    for (const typeLiteral of types) {
                        for (const member of typeLiteral.members) {
                            member.jsDoc = jsDoc?.params?.find(p => p.name === `${param.name}.${member.name}`)!;
                            assert.ok(member.jsDoc);
                            inlinedProperties.set(member.name, member);
                        }
                    }
                }
                if (inlinedProperties.size) {
                    param.type = { type: 'simple', value: 'object' }; // overwrite TS interface name
                }
                return Array.from(inlinedProperties.values());
            });

            const defaultColumnNeeded =
                jsDoc.params.some(p => p.default) ||
                expandedObjectParams.some(props => props.some(m => m.jsDoc.default));

            const columns = defaultColumnNeeded
                ? this.parametersTableColumns
                : this.parametersTableColumns.filter(c => c.header !== 'Default');

            this.lines.push(`${options.heading} Parameters`, '');
            this.lines.push(`| ${columns.map(c => c.header).join(' | ')} |`);
            this.lines.push(`| ${columns.map(c => c.format).join(' | ')} |`);
            for (const [ i, param ] of params.entries()) {
                const jsDocData = jsDoc?.params[ i ];
                if (jsDocData) {
                    assert.equal(param.name, jsDocData.name);
                } else {
                    console.warn(`Missing JsDoc for function param ${name} > ${param.name}`);
                }
                this.lines.push(`| ${columns.map(c => c.toCell(param, jsDocData)).join(' | ')} |`);
                for (const { name, ...rest } of expandedObjectParams[ i ]) {
                    const propData = { name: `${param.name}.${name}`, ...rest }; // from 'joinStyle' to 'options.joinStyle'
                    this.lines.push(`| ${columns.map(c => c.toCell(propData, propData.jsDoc)).join(' | ')} |`);
                }
            }
            this.lines.push('');
        }

        writeReturns(data: FunctionSymbol, options: { heading: '##' | '###' }) {
            const { returns, jsDoc } = data;
            if (!returns) return;

            this.lines.push(`${options.heading} Returns`, '');
            this.lines.push(`<pre className='beefy-code-line'>${this.formatType(returns)}</pre>`, '');
            this.lines.push(this.formatRichText(jsDoc.returns));
            this.lines.push('');
        }

        writeThrows(data: FunctionSymbol, options: { heading: '##' | '###' }) {
            const throws = data.jsDoc.throws;
            if (!throws.length) return;

            this.lines.push(`${options.heading} Throws`, '');
            for (const throwsData of throws) {
                const link = symbolMap.resolveSymbolLink(this.symbol, throwsData.type);
                this.lines.push(`- ${this.asBeefyCode(`[**${link.label}**](${link.target})`)} ${this.formatRichText(throwsData.description)}`);
            }
            this.lines.push('');
        }

        writeSee(data: { jsDoc: JSDoc.Data }, options: { heading: '##' | '###' }) {
            const see = data.jsDoc.see;
            if (!see.length) return;

            this.lines.push(`${options.heading} See also`, '');
            for (const seeData of see) {
                this.lines.push(`- ${this.formatRichText(seeData)}`);
            }
            this.lines.push('');
        }

        writeExamples(data: { jsDoc: JSDoc.Data }, options: { heading: null | '##' | '###' }) {
            const examples = data.jsDoc.examples;
            if (!examples.length) return;

            if (options.heading) {
                this.lines.push(`${options.heading} Examples`, '');
            }
            for (const { title, code, live } of examples) {
                this.lines.push('```js' + (live ? ` ${live}` : '') + (title ? ` title="${title}"` : ''));
                this.lines.push(code);
                this.lines.push('```', '');
            }
        }

        writePrototypeChain(data: ClassLikeSymbol) {
            const { symbol, name, prototypeChain } = data;
            if (!prototypeChain.length) return;

            const parentClass = prototypeChain[ 0 ];
            const ref = symbolMap.getBySymbol(symbol);
            const relation = ref && 'kind' in ref && ref.kind === 'class'
                ? 'is a subclass of'
                : 'extends';
            const link = symbolMap.resolveSymbolLink(this.symbol, parentClass.name);
            this.lines.push(`\`${name}\` ${relation} ${this.asBeefyCode(`[**${link.label}**](${link.target})`)}.`, '');
        }

        writeProperties(data: ClassLikeSymbol, options: { heading: '##' | '###' }) {
            const { properties } = data;
            if (!properties.length) return;

            this.lines.push(`${options.heading} Properties`, '');
            for (const p of properties) {
                const tags = [
                    p.readonly ? 'readonly' : null,
                    p.optional ? 'optional' : null,
                ].filter(Boolean).map(tag => ` <span className='member-tag'>${tag}</span>`).join('');
                this.lines.push(`${options.heading}# \`${p.name}\`${tags} {#${p.name}}`, '');
                this.lines.push(`<div className='indented-section'>`);

                // type
                const ref = p.type.type === 'reference' && symbolMap.getBySymbol(p.type.targetSymbol);
                if (ref && 'kind' in ref && ref.kind === 'type') {
                    this.lines.push(`<pre className='beefy-code-line'>${this.formatType(ref.definition)}</pre>`, '');
                    ref.clearUsagesBySymbol(p.symbol);
                } else {
                    this.lines.push(`<pre className='beefy-code-line'>${this.formatType(p.type)}</pre>`, '');
                }

                // description
                this.writeDescription(p);

                // examples
                this.writeExamples(p, { heading: null });

                this.lines.push(`</div>`, '');
            }
        }

        writeFunctionSignature(data: FunctionSymbol) {
            const params = data.params
                .map(p => `${p.name}${p.optional ? '?' : ''}: ${this.formatType(p.type)}`)
                .join(', ');
            const returns = this.formatType(data.returns);
            const signature = `(${params}) -> ${returns}`;
            this.lines.push(`<pre className='beefy-code-line'>${signature}</pre>`, '');
        }

        writeMethods(data: ClassLikeSymbol, options: { heading: '##' | '###', abbreviated?: boolean }) {
            const { methods } = data;
            if (!methods.length) return;

            this.lines.push(`${options.heading} Methods`, '');
            for (const m of methods) {
                if (options.abbreviated) {
                    this.lines.push(`${options.heading}# [\`${m.name}\`](${m.name}.mdx) {#${m.name}}`, '');
                    this.lines.push(`<div className='indented-section'>`);

                    // signature
                    this.writeFunctionSignature(m);

                    // short description
                    const fullDescription = this.formatRichText(m.jsDoc.description)
                        .replace(/\[(.+?)]\(.+?\)/g, '$1'); // simplify markdown links: `[$1]($2)` -> `$1`
                    // @ts-ignore
                    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
                    const firstSentence = Array.from(segmenter.segment(fullDescription.replace(/\r?\n/g, ' ')))[ 0 ];
                    // @ts-ignore
                    const shortDescription = firstSentence?.segment.trim() || '';
                    this.lines.push(shortDescription);

                    this.lines.push(`</div>`, '');
                } else {
                    this.lines.push(`${options.heading}# \`${m.name}\` {#${m.name}}`, '');
                    this.lines.push(`<div className='indented-section'>`);

                    // signature
                    this.writeFunctionSignature(m);

                    // description
                    this.writeDescription(m);

                    this.lines.push(`</div>`, '');
                }
            }
        }

        writeEditThisSectionLink(data: ExportedSymbol) {
            this.lines.push(`<span className='edit-this-section' title='Edit this section'>[edit](${data.editUrl})</span>`, '');
        }

        async saveToFile(options: { sidebarLabel: string; editUrl?: string; }) {
            const { category, path } = this.symbol.docFile;

            await DocumentationWriter.createCategoryDirectory(category);
            category.childPositionCounter ??= category.children
                ? category.children.length + 1
                : 1;

            const frontMatterFileMetadata = [
                '---',
                `sidebar_label: '${options.sidebarLabel}'`,
                `sidebar_position: ${category.childPositionCounter++}`,
                ...options.editUrl ? [
                    `custom_edit_url: ${options.editUrl}`,
                ] : [],
                '---',
                '',
            ];

            const fileContent = frontMatterFileMetadata.concat(this.lines).join('\n');
            const filePath = join(DOCS_API_DIR, path);
            await writeFile(filePath, fileContent, { encoding: 'utf8' });
            console.log(`${filePath} generated`);
        }

        static CREATED_DIRS = new Set<SidebarCategory>();

        static async createCategoryDirectory(category: SidebarCategory): Promise<void> {
            if (this.CREATED_DIRS.has(category)) return;
            const categoryDir = join(DOCS_API_DIR, category.dir);
            await mkdir(categoryDir, { recursive: true });
            const siblings = category.parent?.children || apiSidebar;
            const position = siblings.indexOf(category);
            assert.ok(position >= 0);
            const categoryIndex = [
                `position: ${position + 1}`,
                `label: '${category.label}'`,
                'collapsed: false',
                `link:`,
                ...category?.linkType === 'doc'
                    ? [
                        `  type: doc`,
                        `  id: index`,
                    ]
                    : [
                        `  type: generated-index`,
                    ],
            ];
            const categoryIndexPath = join(categoryDir, '_category_.yml');
            await writeFile(categoryIndexPath, categoryIndex.join('\n'), { encoding: 'utf8' });
            console.log(`${categoryIndexPath} generated`);
            this.CREATED_DIRS.add(category);
            if (category.parent) {
                await this.createCategoryDirectory(category.parent);
            }
        }

    }


    console.log('API Documentation');

    /** Generate documentation files for functions */
    for (const fnData of symbolMap.exportedSymbols()) {
        if (fnData.kind !== 'function') continue;

        const writer = new DocumentationWriter(fnData);
        writer.writeHeader(fnData);
        writer.writeDescription(fnData);
        writer.writeTypeParameters(fnData, { heading: '##' });
        writer.writeParameters(fnData, { heading: '##' });
        writer.writeReturns(fnData, { heading: '##' });
        writer.writeThrows(fnData, { heading: '##' });
        writer.writeSee(fnData, { heading: '##' });
        writer.writeExamples(fnData, { heading: '##' });
        await writer.saveToFile({ sidebarLabel: fnData.name, editUrl: fnData.editUrl });
    }

    /** Generate documentation files for classes */
    for (const classData of symbolMap.exportedSymbols()) {
        if (classData.kind !== 'class' || classData.prototypeChain.some(ClassLikeSymbol.isErrorClassSymbol)) continue;

        const writer = new DocumentationWriter(classData);
        writer.writeHeader(classData);
        writer.writeDescription(classData);
        writer.writeTypeParameters(classData, { heading: '##' });
        writer.writePrototypeChain(classData);
        writer.writeProperties(classData, { heading: '##' });
        writer.writeMethods(classData, { heading: '##', abbreviated: true });
        await writer.saveToFile({ sidebarLabel: classData.name, editUrl: classData.editUrl });

        for (const methodData of classData.methods) {
            const writer = new DocumentationWriter(methodData);
            const sidebarLabel = methodData.name;
            writer.writeHeader(methodData);
            writer.writeDescription(methodData);
            writer.writeParameters(methodData, { heading: '###' });
            writer.writeReturns(methodData, { heading: '###' });
            writer.writeThrows(methodData, { heading: '###' });
            writer.writeSee(methodData, { heading: '###' });
            writer.writeExamples(methodData, { heading: '###' });
            await writer.saveToFile({ sidebarLabel, editUrl: methodData.editUrl });
        }
    }

    /** Generate documentation for errors */
    {
        let writer: DocumentationWriter = null!;
        for (const errData of symbolMap.exportedSymbols()) {
            if (errData.kind !== 'class' || !errData.prototypeChain.some(ClassLikeSymbol.isErrorClassSymbol)) continue;

            if (!writer) {
                writer = new DocumentationWriter(errData);
                writer.lines.push(`# Errors`, '');
            }

            writer.lines.push(`## ${errData.name} {#${errData.name}}`, '');
            writer.lines.push(`<div className='indented-section'>`);
            writer.writeEditThisSectionLink(errData);
            writer.writeDescription(errData);
            writer.writePrototypeChain(errData);
            writer.writeProperties(errData, { heading: '###' });
            writer.lines.push(`</div>`, '');
        }
        await writer?.saveToFile({ sidebarLabel: 'Errors' });
    }

    /** Generate documentation for types */
    {
        let writer: DocumentationWriter = null!;
        for (const data of symbolMap.exportedSymbols()) {
            if (data.kind !== 'type' && data.kind !== 'interface') continue;
            if (data.kind === 'type' && data.simple) continue;
            if (data.isAlreadyInlined()) continue;

            if (!writer) {
                writer = new DocumentationWriter(data);
                writer.lines.push(`# Type Definitions`, '');
            }

            writer.symbol = data;
            writer.lines.push(`## ${data.name} {#${data.name}}`, '');
            writer.lines.push(`<div className='indented-section'>`);
            writer.writeEditThisSectionLink(data);

            if (data.kind === 'type') {
                writer.lines.push(`<pre className='beefy-code-line'>${writer.formatType(data.definition)}</pre>`, '');
                writer.writeTypeParameters(data, { heading: null });
                writer.writeDescription(data);
            } else {
                writer.writeDescription(data);
                writer.writePrototypeChain(data);
                writer.writeTypeParameters(data, { heading: '###' });
                writer.writeProperties(data, { heading: '###' });
                writer.writeMethods(data, { heading: '###' });

                writer.writeSee(data, { heading: '###' });
                writer.writeExamples(data, { heading: '###' });
            }

            writer.lines.push(`</div>`, '');
        }
        await writer?.saveToFile({ sidebarLabel: 'Type Definitions' });
    }


    /** Generate Monaco Editor extra libs */
    {
        console.log('Monaco Editor extra libs');
        const DOCS_TYPES_DIR = join(DOCS_DIR, './static/types');
        await mkdir(DOCS_TYPES_DIR, { recursive: true });

        const geojsonTypes = await readFile(join(ROOT_DIR, './node_modules/@types/geojson/index.d.ts'), { encoding: 'utf8' });
        const geojsonExtraLib = `declare module "geojson" {\n${geojsonTypes}}\n`;
        const geojsonExtraLibPath = join(DOCS_TYPES_DIR, 'geojson.d.ts');
        await writeFile(geojsonExtraLibPath, geojsonExtraLib, { encoding: 'utf8' });
        console.log(`${geojsonExtraLibPath} generated`);

        const geosTypes = await readFile(join(ROOT_DIR, './dist/esm/index.d.mts'), { encoding: 'utf8' });
        const geosImportDeclarations: string[] = [];
        let geosExtraLib = geosTypes.replace(/import \{.+?} from .+?;/sg, (m) => (geosImportDeclarations.push(m), ''));
        geosExtraLib = geosExtraLib.replace(/\bexport (?:type )?\{.+?};/sg, '');
        geosExtraLib = `${geosImportDeclarations.join('\n')}\ndeclare global {\n${geosExtraLib.trim()}\n}`;
        const geosExtraLibPath = join(DOCS_TYPES_DIR, 'geos.js.d.ts');
        await writeFile(geosExtraLibPath, geosExtraLib, { encoding: 'utf8' });
        console.log(`${geosExtraLibPath} generated`);
    }
}();
