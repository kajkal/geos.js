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
        label: 'Operations',
        dir: '/operations',
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


const externalTypeLinks = {
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

    export interface TypeLiteral {
        type: 'typeLiteral',
        members: TypeLiteralMember[];
    }

    export interface TypeLiteralMember {
        name: string;
        optional: boolean;
        type: Type;
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

    export interface TypeParamData {
        name: string;
    }

    export interface ParamData {
        name: string;
        type: Type;
        optional?: boolean;
    }

    export interface PropertyData {
        name: string;
        type: Type;
        optional: boolean;
        readonly: boolean;
        jsDoc: JSDoc.Data;
    }

}

namespace JSDoc {

    export interface RichTextNode {
        text: string;
        link?: string;
    }

    export interface TypeParamData {
        name: string;
        description: RichTextNode[];
    }

    export interface ParamData {
        name: string;
        description: RichTextNode[];
        optional: boolean;
        default: string;
    }

    export interface Example {
        title?: string;
        code: string;
        live?: boolean;
    }

    export interface Data {
        description: RichTextNode[];
        default: string | null;
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

    export function readJSDocRichText(nodeOrNodes: string | ts.NodeArray<ts.JSDocComment>): RichTextNode[] {
        if (typeof nodeOrNodes === 'string') return [ { text: nodeOrNodes } ];
        const textNodes: RichTextNode[] = [];
        for (const node of nodeOrNodes) {
            switch (node.kind) {
                case ts.SyntaxKind.JSDocText: {
                    if ((node as ts.JSDocText).text) {
                        textNodes.push({ text: node.text });
                    }
                    break;
                }
                case ts.SyntaxKind.JSDocLink: {
                    const link = node.getText().match(/^\{@link (.+)}$/)[ 1 ];
                    const lastTextNode = textNodes.at(-1);
                    const linkTextMatch = lastTextNode?.text.match(/\[([^\[]+)]$/);
                    if (linkTextMatch) {
                        if (linkTextMatch.index) { // there is something beside `[link text]` in the prev text node
                            lastTextNode.text = lastTextNode?.text.slice(0, linkTextMatch.index);
                            textNodes.push({ text: linkTextMatch[ 1 ], link });
                        } else {
                            textNodes[ textNodes.length - 1 ] = { text: linkTextMatch[ 1 ], link };
                        }
                    } else {
                        const [ linkRef, linkText ] = link.split(/[ |](.*)/);
                        textNodes.push({ text: linkText || linkRef, link: linkRef });
                    }
                    break;
                }
                default: {
                    throw new Error(`Unexpected node kind: ${ts.SyntaxKind[ node.kind ]}`);
                }
            }
        }
        return textNodes;
    }

    export function readJSDoc(node: ts.Node): Data {
        const data: Data = {
            description: [],
            default: null,
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
        assert.ok(ts.isJSDoc(doc));
        if (doc.comment) {
            data.description = readJSDocRichText(doc.comment);
        }
        for (const tag of doc.tags || []) {
            switch (tag.kind) {
                case ts.SyntaxKind.JSDocTemplateTag: {
                    assert.ok(ts.isJSDocTemplateTag(tag));
                    assert.equal(tag.typeParameters.length, 1);
                    data.typeParams.push({
                        name: tag.typeParameters[ 0 ].name.getText(),
                        description: readJSDocRichText(tag.comment),
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
                        description: readJSDocRichText(tag.comment),
                        optional,
                        default: defaultValue,
                    });
                    break;
                }
                case ts.SyntaxKind.JSDocReturnTag: {
                    assert.ok(ts.isJSDocReturnTag(tag));
                    assert.ok(!tag.typeExpression); // no type in return tag
                    assert.ok(!data.returns.length);
                    data.returns = readJSDocRichText(tag.comment);
                    break;
                }
                case ts.SyntaxKind.JSDocThrowsTag: {
                    assert.ok(ts.isJSDocThrowsTag(tag));
                    const errorClass = tag.typeExpression.getText(); // requires `@throws {ErrorClass} ` format
                    assert.match(errorClass, /^\{\w+}$/);
                    data.throws.push({
                        type: errorClass.slice(1, -1),
                        description: readJSDocRichText(tag.comment),
                    });
                    break;
                }
                case ts.SyntaxKind.JSDocSeeTag: {
                    assert.ok(ts.isJSDocSeeTag(tag));
                    data.see.push(readJSDocRichText(tag.comment));
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
                            let live = false;
                            let [ header, ...lines ] = tag.getFullText()
                                .split(/\r?\n/)
                                .map(l => l.replace(/^\s*\*(?: |$)/, ''));
                            header = header.replace(/^@example\s*/, '');
                            header = header.replace(/^#live\s*/, () => (live = true, ''));
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

}


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
    const ROOT_DIR = join(import.meta.dirname, '../..');
    const SRC_INDEX_FILE_PATH = join(ROOT_DIR, './src/index.mts');
    const DOCS_DIR = join(ROOT_DIR, './docs');
    const DOCS_API_DIR = join(DOCS_DIR, './docs/api');

    const sha = execSync(`git -C ${ROOT_DIR} rev-parse --verify HEAD`, { encoding: 'utf8' }).trim();
    const EDIT_BASE_URL = `https://github.com/kajkal/geos.js/blob/${sha.slice(0, 7)}`;

    /** Process source files */
    const program = ts.createProgram([ SRC_INDEX_FILE_PATH ], {});
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(SRC_INDEX_FILE_PATH);
    assert.ok(sourceFile);

    abstract class BaseSymbol {

        name: string;
        symbol: ts.Symbol;
        usages: ts.Node[] = []; // nodes where symbol is used

        docFile: {
            category: SidebarCategory;
            path: string;
            id?: string;
        };

        editUrl: string; // url to src file

        constructor(symbol: ts.Symbol) {
            this.symbol = symbol;
            assert.ok(!(symbol.flags & ts.SymbolFlags.Alias)); // not an alias
            const sources = symbol.getDeclarations()
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

        processTypeNode(typeNode: ts.TypeNode): TS.Type {
            switch (typeNode.kind) {
                case ts.SyntaxKind.BooleanKeyword:
                case ts.SyntaxKind.NumberKeyword:
                case ts.SyntaxKind.StringKeyword:
                case ts.SyntaxKind.ObjectKeyword:
                case ts.SyntaxKind.VoidKeyword:
                case ts.SyntaxKind.NeverKeyword:
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
                    const symbol = type.aliasSymbol ?? type.getSymbol();
                    const declaration = symbol.getDeclarations()[ 0 ];
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
                        typeArguments: typeNode.typeArguments?.map(node => this.processTypeNode(node)),
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
                        elementType: this.processTypeNode(typeNode),
                    };
                }
                case ts.SyntaxKind.UnionType: {
                    assert.ok(ts.isUnionTypeNode(typeNode));
                    return {
                        type: 'union',
                        types: typeNode.types.map(node => this.processTypeNode(node)),
                    };
                }
                case ts.SyntaxKind.IntersectionType: {
                    assert.ok(ts.isIntersectionTypeNode(typeNode));
                    return {
                        type: 'intersection',
                        types: typeNode.types.map(node => this.processTypeNode(node)),
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
                                type: this.processTypeNode(node.type),
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
                                type: this.processTypeNode(node.type),
                            };
                        }),
                    };
                }
                default: {
                    throw new Error(`Unexpected node type '${ts.SyntaxKind[ typeNode.kind ]}'`);
                }
            }
        }

    }

    class FunctionSymbol extends BaseSymbol {

        readonly kind = 'function';

        parent?: ClassLikeSymbol; // when function is a method
        typeParams?: TS.TypeParamData[];
        params: TS.ParamData[];
        returns: TS.Type;
        jsDoc: JSDoc.Data;

        constructor(symbol: ts.Symbol, node?: ts.SignatureDeclarationBase) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations();
                assert.ok(declarations.length >= 1);
                const overloads = declarations.map(declaration => {
                    assert.ok(ts.isFunctionDeclaration(declaration));
                    return new FunctionSymbol(symbol, declaration);
                });
                const data = overloads.at(-1);
                data.jsDoc = overloads.at(0).jsDoc;
                return data;
            }

            this.name = node.name.getText();
            this.typeParams = node.typeParameters
                ?.map(typeParamNode => ({
                    name: typeParamNode.name.text,
                }));
            this.params = node.parameters
                .map(paramNode => ({
                    name: paramNode.name.getText(),
                    type: this.processTypeNode(paramNode.type),
                    optional: Boolean(paramNode.questionToken),
                }));
            this.returns = this.processTypeNode(node.type);
            this.jsDoc = JSDoc.readJSDoc(node);
        }

    }

    class ClassLikeSymbol extends BaseSymbol {

        readonly kind: 'class' | 'interface';

        prototypeChain: string[] = [];
        typeParams?: TS.TypeParamData[];
        properties: TS.PropertyData[] = [];
        methods: FunctionSymbol[] = [];
        jsDoc: JSDoc.Data;

        constructor(kind: 'class' | 'interface', symbol: ts.Symbol, node?: ts.ClassDeclaration | ts.InterfaceDeclaration) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations();
                assert.equal(declarations.length, 1);
                if (kind === 'class') {
                    assert.ok(ts.isClassDeclaration(declarations[ 0 ]));
                } else {
                    assert.ok(ts.isInterfaceDeclaration(declarations[ 0 ]));
                }
                return new ClassLikeSymbol(kind, symbol, declarations[ 0 ]);
            }

            this.name = node.name.text;
            this.kind = kind;
            this.jsDoc = JSDoc.readJSDoc(node);

            let classNode = node;
            while (classNode?.heritageClauses) {
                assert.ok(classNode);
                assert.equal(classNode.heritageClauses.length, 1);
                const clause = classNode.heritageClauses[ 0 ];
                assert.equal(clause.types.length, 1);
                let symbol = checker.getSymbolAtLocation(clause.types[ 0 ].expression);
                if (symbol.flags & ts.SymbolFlags.Alias) {
                    symbol = checker.getAliasedSymbol(symbol);
                }
                assert.ok(symbol);
                this.prototypeChain.push(symbol.getName());
                if (symbol.flags & ts.SymbolFlags.Class) {
                    classNode = symbol.getDeclarations().find(ts.isClassDeclaration);
                } else { // verify that this is a build-in class
                    assert.ok(symbol.flags & ts.SymbolFlags.FunctionScopedVariable);
                    assert.ok(symbol.flags & ts.SymbolFlags.Interface);
                    assert.ok(!symbol[ 'parent' ]);
                    break;
                }
            }

            this.typeParams = node.typeParameters
                ?.map(typeParamNode => ({
                    name: typeParamNode.name.text,
                }));

            for (const memberNode of node.members) {
                const internalSymbol = ts.getJSDocTags(memberNode).some(tag => tag.tagName.getText() === 'internal');
                if (internalSymbol) continue;
                if (ts.isPropertyDeclaration(memberNode) || ts.isPropertySignature(memberNode)) {
                    assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static property
                    this.properties.push({
                        name: memberNode.name.getText(),
                        type: this.processTypeNode(memberNode.type),
                        optional: Boolean(memberNode.questionToken),
                        readonly: Boolean(memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword)),
                        jsDoc: JSDoc.readJSDoc(memberNode),
                    });
                } else if (ts.isMethodDeclaration(memberNode) || ts.isMethodSignature(memberNode)) {
                    assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static method
                    this.methods.push(new FunctionSymbol(checker.getSymbolAtLocation(memberNode.name), memberNode));
                } else {
                    throw new Error(`Unexpected node kind: ${ts.SyntaxKind[ memberNode.kind ]}`);
                }
            }
        }

    }

    class TypeSymbol extends BaseSymbol {

        readonly kind = 'type';

        definition: TS.Type;
        typeParams?: TS.TypeParamData[];
        jsDoc: JSDoc.Data;

        constructor(symbol: ts.Symbol, node?: ts.TypeAliasDeclaration) {
            super(symbol);
            if (!node) {
                const declarations = symbol.getDeclarations();
                assert.equal(declarations.length, 1);
                assert.ok(ts.isTypeAliasDeclaration(declarations[ 0 ]));
                return new TypeSymbol(symbol, declarations[ 0 ]);
            }

            this.name = node.name.text;
            this.definition = this.processTypeNode(node.type);
            this.typeParams = node.typeParameters
                ?.map(typeParamNode => ({
                    name: typeParamNode.name.text,
                }));
            this.jsDoc = JSDoc.readJSDoc(node);
        }

    }


    type AnySymbol = FunctionSymbol | ClassLikeSymbol | TypeSymbol;

    const symbolMap = new class {

        symbols = new Map<ts.Symbol, AnySymbol | { usages: ts.Node[] }>();
        symbolsByName = new Map<string, AnySymbol>();

        constructor() {
            const addUsages = (node: ts.Node) => {
                if (ts.isIdentifier(node)) {
                    let symbol = checker.getSymbolAtLocation(node);
                    if (symbol) {
                        if (symbol.flags & ts.SymbolFlags.Alias) {
                            symbol = checker.getAliasedSymbol(symbol); // resolve import aliases
                        }
                        assert.ok(node.parent);
                        if (
                            !ts.isDeclarationStatement(node.parent) &&
                            !ts.isExportSpecifier(node.parent) &&
                            !ts.isImportSpecifier(node.parent)
                        ) {
                            const value = this.symbols.get(symbol) || { usages: [] };
                            value.usages.push(node);
                            this.symbols.set(symbol, value);
                        }
                    }
                }
                ts.forEachChild(node, addUsages);
            };

            /** Collect all symbol usages */
            for (const sourceFile of program.getSourceFiles()) {
                if (!sourceFile.isDeclarationFile) {
                    addUsages(sourceFile);
                }
            }
        }

        addData(symbol: ts.Symbol, data: AnySymbol) {
            const usages = this.symbols.get(symbol);
            assert.ok(!usages || !('name' in usages));
            data.usages = usages?.usages || [];
            this.symbols.set(symbol, data);
            this.symbolsByName.set(data.name, data);
        };

        relativeURL(source: BaseSymbol, target: BaseSymbol, id = target.docFile.id) {
            const relativePath = relative(dirname(source.docFile.path), target.docFile.path).replaceAll(sep, '/');
            return `${relativePath}${id ? `#${id}` : ''}`;
        };

        resolveSymbolLink(source: BaseSymbol, target: ts.Symbol | string, text?: string): { label: string, target: string } {
            if (typeof target === 'string') {
                const match = this.symbolsByName.get(target);
                if (match && 'docFile' in match) {
                    return { label: target, target: this.relativeURL(source, match) };
                }
                const buildInUrl = externalTypeLinks[ 'typescript' ][ target ];
                if (buildInUrl) {
                    return { label: target, target: buildInUrl };
                }
                throw new Error(`unresolved symbol '${target}'`);
            }
            const match = this.symbols.get(target);
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
            let match = this.symbolsByName.get(target);
            if (match) {
                return `[${linkLabel}](${this.relativeURL(source, match)})`;
            }
            // to handle syntax `Geometry#toJSON`
            const [ targetClass, targetMember ] = target.split('#');
            const matchByClass = this.symbolsByName.get(targetClass);
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

        * exportedSymbols() {
            yield* this.symbolsByName.values();
        }

    }();


    /** Collect exported symbols from `index.mts` */
    ts.forEachChild(sourceFile, (node) => {
        if (!ts.isExportDeclaration(node)) return; // get only exports from `index.mts`

        assert.ok(ts.isNamedExports(node.exportClause));
        let symbolsToProcess: ts.Symbol[];
        let path: string;

        if (node.moduleSpecifier) {
            // exports/imports from another module
            assert.ok(ts.isStringLiteral(node.moduleSpecifier));
            path = node.moduleSpecifier.text; // eg './io/wkt.mjs'
            const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
            symbolsToProcess = node.exportClause.elements.map(es => {
                return checker.tryGetMemberInModuleExports(es.name.text, symbol);
            });
        } else {
            // exports from index.mts itself
            path = './' + basename(sourceFile.fileName);
            symbolsToProcess = node.exportClause.elements.map(es => {
                const symbol = checker.getSymbolAtLocation(es.propertyName || es.name);
                assert.ok(symbol.flags & ts.SymbolFlags.Alias); // is re-export
                return checker.getAliasedSymbol(symbol);
            });
        }

        for (const symbol of symbolsToProcess) {
            const name = symbol.name;
            let data: AnySymbol;

            switch (symbol.flags) {
                case ts.SymbolFlags.Function: {
                    const dirPath = dirname(path); // eg './io'
                    const category = apiSidebar.find(c => c.forced?.has(name))
                        || apiSidebar.find(c => `.${c.dir}` === dirPath);
                    assert.ok(category);

                    data = new FunctionSymbol(symbol);
                    data.docFile = {
                        category,
                        path: join(category.dir, `${name}.mdx`),
                    };
                    break;
                }
                case ts.SymbolFlags.Class: {
                    const category = apiSidebar.find(c => c.dir === '/types');

                    data = new ClassLikeSymbol('class', symbol);
                    if (data.prototypeChain.includes('Error')) {
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

            symbolMap.addData(symbol, data);
        }
    });


    class DocumentationWriter {

        symbol: AnySymbol;
        lines: string[] = [];

        constructor(symbol: AnySymbol) {
            this.symbol = symbol;
        }

        formatRichText(textNodes: JSDoc.RichTextNode[]) {
            return textNodes
                .map(({ text, link }) => (
                    link
                        ? symbolMap.createLink(this.symbol, link, text)
                        : text
                ))
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
                        const id = `${this.symbol.name}:${type.name}`;
                        let linkTarget = `#${id}`; // local ref
                        if (this.symbol.kind === 'function' && this.symbol.parent) {
                            linkTarget = symbolMap.relativeURL(this.symbol, this.symbol.parent, `${id}`); // ref to parent
                        }
                        return wrapper(`[<span className='type-parameter'>${type.name}</span>](${linkTarget})`);
                    }
                    let name: string;
                    if (type.declarationRef) {
                        const href = externalTypeLinks[ type.declarationRef.package ]?.[ type.declarationRef.name ];
                        assert.ok(href);
                        name = `[**${type.name}**](${href})`;
                    } else {
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

        writeHeader(data: AnySymbol) {
            this.lines.push(`# ${data.name}`, '');
        }

        writeDescription(data: { jsDoc: JSDoc.Data }) {
            const description = data.jsDoc.description;
            if (!description.length) return;

            this.lines.push(this.formatRichText(description), '');
        }

        name_column = {
            header: 'Name',
            format: '---',
            toCell: (tsData: TS.ParamData, _jsDocData: Pick<JSDoc.ParamData, never>) => {
                return `\`${tsData.name}${tsData.optional ? '?' : ''}\``;
            },
        };
        type_column = {
            header: 'Type',
            format: ':-:',
            toCell: (tsData: TS.ParamData, _jsDocData: Pick<JSDoc.ParamData, never>) => {
                return this.formatType(tsData.type, this.asBeefyCode);
            },
        };
        default_column = {
            header: 'Default',
            format: ':-:',
            toCell: (_tsData: TS.ParamData, jsDocData: Pick<JSDoc.ParamData, 'default'>) => {
                return jsDocData.default && `\`${jsDocData.default}\``;
            },
        };
        description_column = {
            header: 'Description',
            format: '---',
            toCell: (_tsData: TS.ParamData, jsDocData: Pick<JSDoc.ParamData, 'description'>) => {
                const desc = jsDocData?.description;
                if (!desc?.length) return '';

                const rawLines = this.formatRichText(desc).replace(/^[\s-]*/, '').split(/\r?\n/);
                const lines = [];
                let listMode = false;

                for (const line of rawLines) {
                    if (listMode) {
                        if (line.startsWith('- ')) {
                            // close prev bullet and start new
                            lines.push(`</li><li>${line.slice(2)}`);
                        } else if (!line) {
                            listMode = false;
                            // close prev bullet and list
                            lines.push(`</li></ul>`);
                        } else {
                            // continue an active bullet
                            lines.push(line);
                        }
                    } else {
                        if (line.startsWith('- ')) {
                            listMode = true;
                            // open a new bullet
                            lines.push(`<ul><li>${line.slice(2)}`);
                        } else if (!line) {
                            lines.push('<br/>');
                        } else {
                            lines.push(line);
                        }
                    }
                }
                if (listMode) {
                    lines.push(`</li></ul>`);
                }

                return lines.join(' ');
            },
        };

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

        writeParameters(data: FunctionSymbol, options: { heading: '##' | '###' }) {
            const { symbol: { symbol: fnSymbol } } = this;
            const { name, params, jsDoc } = data;
            if (!params.length) return;

            const paramsTypeRef = params.map(p => {
                const symbol = p.type.type === 'reference' ? p.type.targetSymbol : null;
                const ref = symbolMap.symbols.get(symbol);
                return ref && 'kind' in ref && ref.kind === 'interface' ? ref : null;
            });

            const defaultColumnNeeded =
                jsDoc.params.some(p => p.default) ||
                paramsTypeRef.some(ref => ref?.properties.some(m => m.jsDoc.default));

            const columns = defaultColumnNeeded
                ? [ this.name_column, this.type_column, this.default_column, this.description_column ]
                : [ this.name_column, this.type_column, this.description_column ];

            this.lines.push(`${options.heading} Parameters`, '');
            this.lines.push(`| ${columns.map(c => c.header).join(' | ')} |`);
            this.lines.push(`| ${columns.map(c => c.format).join(' | ')} |`);

            for (const [ i, tsData ] of params.entries()) {
                const jsDocData = jsDoc?.params[ i ];
                if (jsDocData) {
                    assert.equal(tsData.name, jsDocData.name);
                } else {
                    console.warn(`Missing JsDoc for function param ${name} > ${tsData.name}`);
                }

                const referencedInterface = paramsTypeRef[ i ];
                if (referencedInterface) {
                    const declarations: ts.Node[] = fnSymbol.getDeclarations();
                    const allUsages = referencedInterface.usages;
                    const otherUsages = allUsages
                        .filter(usage => {
                            for (let node = usage; node; node = node.parent) {
                                if (declarations.includes(node)) return false;
                            }
                            return true;
                        });
                    referencedInterface.usages = otherUsages;
                    tsData.type = { type: 'simple', value: 'object' }; // overwrite TS interface name
                }

                this.lines.push(`| ${columns.map(c => c.toCell(tsData, jsDocData)).join(' | ')} |`);

                if (referencedInterface) {
                    assert.ok(!referencedInterface.methods.length);
                    assert.ok(referencedInterface.properties.length);
                    for (const propData of referencedInterface.properties) {
                        const propDataCopy = { ...propData, name: `${tsData.name}.${propData.name}` }; // from 'joinStyle' to 'options.joinStyle'
                        this.lines.push(`| ${columns.map(c => c.toCell(propDataCopy, propDataCopy.jsDoc)).join(' | ')} |`);
                    }
                }

                // to handle inlined types like `options: { by: number } | { to: number }`
                if (tsData.type.type === 'union' && tsData.type.types.every(t => t.type === 'typeLiteral')) {
                    for (const typeLiteral of tsData.type.types) {
                        for (const member of typeLiteral.members) {
                            const propJsDocData = jsDoc?.params?.find(p => p.name === `${tsData.name}.${member.name}`);
                            assert.ok(propJsDocData);
                            member.name = `${tsData.name}.${member.name}`;
                            this.lines.push(`| ${columns.map(c => c.toCell(member, propJsDocData)).join(' | ')} |`);
                        }
                    }
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
                this.lines.push('```js' + (live ? ' live' : '') + (title ? ` title="${title}"` : ''));
                this.lines.push(code);
                this.lines.push('```', '');
            }
        }

        writePrototypeChain(data: ClassLikeSymbol) {
            const { symbol, name, prototypeChain } = data;
            if (!prototypeChain.length) return;

            const parentClass = prototypeChain[ 0 ];
            const ref = symbolMap.symbols.get(symbol);
            const relation = ref && 'kind' in ref && ref.kind === 'class'
                ? 'is a subclass of'
                : 'extends';
            const link = symbolMap.resolveSymbolLink(this.symbol, parentClass);
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
                const ref = p.type.type === 'reference' && symbolMap.symbols.get(p.type.targetSymbol);
                if (ref && 'kind' in ref && ref.kind === 'type' && ref.usages.length === 1) {
                    this.lines.push(`<pre className='beefy-code-line'>${this.formatType(ref.definition)}</pre>`, '');
                    ref.usages = [];
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
                    const fullDescription = this.formatRichText(m.jsDoc.description);
                    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
                    const firstSentence = Array.from(segmenter.segment(fullDescription.replace(/\r?\n/g, ' ')))[ 0 ];
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

        writeEditThisSectionLink(data: AnySymbol) {
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
        if (classData.kind !== 'class' || classData.prototypeChain.includes('Error')) continue;

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
        let writer: DocumentationWriter;
        for (const errData of symbolMap.exportedSymbols()) {
            if (errData.kind !== 'class' || !errData.prototypeChain.includes('Error')) continue;

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
        await writer.saveToFile({ sidebarLabel: 'Errors' });
    }

    /** Generate documentation for types */
    {
        let writer: DocumentationWriter;
        for (const data of symbolMap.exportedSymbols()) {
            if ((data.kind !== 'type' && data.kind !== 'interface')) continue;
            if (!data.usages.length) continue;

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
        const geosImportDeclarations = [];
        let geosExtraLib = geosTypes.replace(/import \{.+?} from .+?;/sg, (m) => (geosImportDeclarations.push(m), ''));
        geosExtraLib = geosExtraLib.replace(/\bexport (?:type )?\{.+?};/sg, '');
        geosExtraLib = `${geosImportDeclarations.join('\n')}\ndeclare global {\n${geosExtraLib.trim()}\n}`;
        const geosExtraLibPath = join(DOCS_TYPES_DIR, 'geos.js.d.ts');
        await writeFile(geosExtraLibPath, geosExtraLib, { encoding: 'utf8' });
        console.log(`${geosExtraLibPath} generated`);
    }
}();
