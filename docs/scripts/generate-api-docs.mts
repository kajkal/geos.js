import assert from 'node:assert/strict';
import { basename, dirname, join, relative } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
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
    },
    {
        label: 'Types',
        dir: '/types',
    },
];


class SymbolMap extends Map<string, SymbolData> {
    constructor() {
        super([
            [ 'string' ],
            [ 'number' ],
            [ 'boolean' ],
            [ 'object' ],
            [ 'void' ],
            [ 'Uint8Array', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array' ],
            [ 'Promise', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' ],
            [ 'Response', 'https://developer.mozilla.org/en-US/docs/Web/API/Response' ],
            [ 'Error', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error' ],
            [ 'WebAssembly.Module', 'https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Module' ],
            [ 'GeoJSONGeometry', 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1' ],
            [ 'Position', 'https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1' ],
        ].map(([ name, link ]) => [ name, { kind: Kind.basic, link } ]));
    }
}

interface SidebarCategory {
    label: string;
    dir: string;
    forced?: Set<string>; // symbols forced into this category
    childPositionCounter?: number;
    children?: SidebarCategory[];
    parent?: SidebarCategory;
    linkType?: 'generated-index' | 'doc'; // 'generated-index' by default
}

enum Kind {
    basic = 'basic',
    function = 'function',
    class = 'class',
    interface = 'interface',
    type = 'type',
}

type SymbolData = { kind: Kind.basic; link?: string; }
    | FunctionData
    | TypeData
    | InterfaceData
    | ClassData;

interface SymbolMetadata {
    symbol: ts.Symbol;
    category: SidebarCategory;
    path: string;
    id?: string;
}

interface FunctionData {
    kind: Kind.function;
    name: string;
    meta: SymbolMetadata;
    params: TsParamData[];
    returns: TsTypeData;
    jsDoc: JsDocData;
}

interface PropertyData {
    name: string;
    type: TsTypeData;
    optional: boolean;
    jsDoc: JsDocData;
}

interface ClassData {
    kind: Kind.class;
    name: string;
    meta: SymbolMetadata;
    prototypeChain: string[];
    properties: PropertyData[];
    methods: FunctionData[];
    jsDoc: JsDocData;
}

interface InterfaceData {
    kind: Kind.interface;
    name: string;
    meta: SymbolMetadata;
    prototypeChain: string[];
    properties: PropertyData[];
    methods: FunctionData[];
    jsDoc: JsDocData;
}

interface TypeData {
    kind: Kind.type;
    name: string;
    meta: SymbolMetadata;
    definition: string;
    jsDoc: JsDocData;
}


interface TsTypeData {
    type: string; // `a`
    types?: TsTypeData[]; // `a | b` or `a & b`
    array?: number; // `a` => 0; `a[][]` => 2
    typeArgs?: TsTypeData[]; // `a<b>` => [ `b` ]
    props?: TsParamData[]; // for type literals; { a: b }
    tupleElements?: TsTupleMemberData[];
}

interface TsParamData {
    name: string;
    type: TsTypeData;
    optional?: boolean;
}

interface TsTupleMemberData {
    type: TsTypeData;
    name: string;
    optional: boolean;
}

interface JsDocRichTextNode {
    text: string;
    link?: string;
}

interface JsDocParamData {
    name: string;
    description: JsDocRichTextNode[];
    optional: boolean;
    default: string;
}

interface JsDocData {
    description: JsDocRichTextNode[];
    default: string | null;
    params: JsDocParamData[];
    returns: JsDocRichTextNode[];
    throws: {
        type: TsTypeData;
        description: JsDocRichTextNode[];
    }[];
    see: JsDocRichTextNode[][];
    examples: {
        title?: string;
        code: string;
        live?: boolean;
    }[];
}


/**
 * Collects data from `./src` source files TypeScript types and JSDoc comments
 * to generate docs.
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
    const DOCS_DIR_PATH = join(ROOT_DIR, './docs/docs/api');

    /** Process source files */
    const program = ts.createProgram([ SRC_INDEX_FILE_PATH ], {});
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(SRC_INDEX_FILE_PATH);
    assert.ok(sourceFile);

    const usageMap = new Map<ts.Symbol, ts.Node[]>();
    const symbolMap = new SymbolMap();


    function processJsDocRichText(nodeOrNodes: string | ts.NodeArray<ts.JSDocComment>): JsDocRichTextNode[] {
        if (typeof nodeOrNodes === 'string') return [ { text: nodeOrNodes } ];
        const textNodes = [];
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

    function processJsDoc(node: ts.Node): JsDocData {
        const data: JsDocData = {
            description: [],
            default: null,
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
            data.description = processJsDocRichText(doc.comment);
        }
        for (const tag of doc.tags || []) {
            switch (tag.kind) {
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
                        default: defaultValue,
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
                    const errorClass = tag.typeExpression.getText(); // requires `@throws {ErrorClass} ` format
                    assert.match(errorClass, /^\{\w+}$/);
                    data.throws.push({
                        type: { type: errorClass.slice(1, -1) },
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
                            let live = false;
                            let [ header, ...lines ] = tag.getFullText()
                                .split('\n')
                                .map(l => l.replace(/^\s*\*(?: |$)/, ''));
                            header = header.replace(/^@example\s*/, '');
                            header = header.replace(/^#live\s*/, () => (live = true, ''));
                            data.examples.push({
                                title: header || null,
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

    function processTypeNode(typeNode: ts.TypeNode): TsTypeData {
        let array = 0;
        for (; ts.isArrayTypeNode(typeNode); typeNode = typeNode.elementType) array++;
        assert.ok(!ts.isIntersectionTypeNode(typeNode)); // not `a & b`
        return {
            type: ts.isTypeReferenceNode(typeNode)
                ? typeNode.typeName?.getText()
                : typeNode.getText(),
            types: ts.isUnionTypeNode(typeNode)
                ? typeNode.types?.map(processTypeNode)
                : null,
            array,
            typeArgs: ts.isTypeReferenceNode(typeNode)
                ? typeNode.typeArguments?.map(processTypeNode)
                : null,
            props: ts.isTypeLiteralNode(typeNode)
                ? typeNode.members.map(m => {
                    assert.ok(ts.isPropertySignature(m));
                    return {
                        name: m.name.getText(),
                        type: processTypeNode(m.type),
                    };
                })
                : null,
            tupleElements: ts.isTupleTypeNode(typeNode)
                ? typeNode.elements.map(el => {
                    assert.ok(ts.isNamedTupleMember(el));
                    assert.ok(!el.dotDotDotToken);
                    return {
                        type: processTypeNode(el.type),
                        name: el.name.getText(),
                        optional: Boolean(el.questionToken),
                    };
                })
                : null,
        };
    }

    function processFunctionNode(node: ts.FunctionLikeDeclarationBase, symbol: ts.Symbol): FunctionData {
        return {
            kind: Kind.function,
            name: node.name.getText(),
            meta: {
                symbol,
                category: null!,
                path: null!,
            },
            params: node.parameters.map<TsParamData>(paramNode => ({
                name: paramNode.name.getText(),
                type: processTypeNode(paramNode.type),
                optional: Boolean(paramNode.questionToken),
            })),
            returns: processTypeNode(node.type),
            jsDoc: processJsDoc(node),
        };
    }

    function processClassLikeNode(node: ts.ClassDeclaration | ts.InterfaceDeclaration, symbol: ts.Symbol): ClassData {
        const prototypeChain: string[] = [];
        const properties: PropertyData[] = [];
        const methods: FunctionData[] = [];

        let classNode = node;
        while (classNode?.heritageClauses) {
            assert.ok(classNode);
            assert.equal(classNode.heritageClauses.length, 1);
            const clause = classNode.heritageClauses[ 0 ];
            assert.equal(clause.types.length, 1);
            const symbol = checker.getSymbolAtLocation(clause.types[ 0 ].expression);
            assert.ok(symbol);
            prototypeChain.push(symbol.getName());
            if (symbol.flags & ts.SymbolFlags.Alias) {
                classNode = checker.getAliasedSymbol(symbol).getDeclarations().find(ts.isClassDeclaration);
            } else if (symbol.flags & ts.SymbolFlags.Class) {
                classNode = symbol.getDeclarations().find(ts.isClassDeclaration);
            } else { // verify that this is a build-in class
                assert.ok(symbol.flags & ts.SymbolFlags.FunctionScopedVariable);
                assert.ok(symbol.flags & ts.SymbolFlags.Interface);
                assert.ok(!symbol[ 'parent' ]);
                break;
            }
        }

        for (const memberNode of node.members) {
            const internalSymbol = ts.getJSDocTags(memberNode).some(tag => tag.tagName.getText() === 'internal');
            if (internalSymbol) continue;
            if (ts.isPropertyDeclaration(memberNode) || ts.isPropertySignature(memberNode)) {
                assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static property
                properties.push({
                    name: memberNode.name.getText(),
                    type: processTypeNode(memberNode.type),
                    optional: Boolean(memberNode.questionToken),
                    jsDoc: processJsDoc(memberNode),
                });
            } else if (ts.isMethodDeclaration(memberNode)) {
                assert.ok(!memberNode.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)); // not a static method
                methods.push(processFunctionNode(memberNode, checker.getSymbolAtLocation(memberNode.name)));
            } else {
                throw new Error(`Unexpected node kind: ${ts.SyntaxKind[ memberNode.kind ]}`);
            }
        }

        return {
            kind: Kind.class,
            name: node.name.text,
            meta: {
                symbol,
                category: null!,
                path: null!,
            },
            prototypeChain,
            properties,
            methods,
            jsDoc: processJsDoc(node),
        };
    }

    function visit(node: ts.Node): void {
        if (ts.isIdentifier(node)) {
            let symbol = checker.getSymbolAtLocation(node);
            if (symbol) {
                if (symbol.flags & ts.SymbolFlags.Alias) {
                    symbol = checker.getAliasedSymbol(symbol); // resolve import aliases
                }
                assert.ok(node.parent);
                if (!ts.isDeclarationStatement(node.parent) && !ts.isExportSpecifier(node.parent) && !ts.isImportSpecifier(node.parent)) {
                    usageMap.set(symbol, [ ...usageMap.get(symbol) || [], node ]);
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    /** Collect all symbol usages */
    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
            visit(sourceFile);
        }
    }

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
            const declarations = symbol.getDeclarations();
            let data: FunctionData | ClassData | InterfaceData | TypeData;

            switch (symbol.flags) {
                case ts.SymbolFlags.Function: {
                    assert.equal(declarations.length, 1);
                    assert.ok(ts.isFunctionDeclaration(declarations[ 0 ]));

                    const dirPath = dirname(path); // eg './io'
                    const category = apiSidebar.find(c => c.forced?.has(name))
                        || apiSidebar.find(c => `.${c.dir}` === dirPath);
                    assert.ok(category);

                    data = processFunctionNode(declarations[ 0 ], symbol);
                    data.meta.category = category;
                    data.meta.path = join(category.dir, `${name}.mdx`);
                    break;
                }
                case ts.SymbolFlags.Class: {
                    assert.equal(declarations.length, 1);
                    assert.ok(ts.isClassDeclaration(declarations[ 0 ]));

                    const category = apiSidebar.find(c => c.dir === '/types');

                    data = processClassLikeNode(declarations[ 0 ], symbol);
                    if (data.prototypeChain.includes('Error')) {
                        assert.equal(data.methods.length, 0);
                        data.meta.category = category;
                        data.meta.path = join(category.dir, 'errors.mdx');
                        data.meta.id = name;
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
                            methodData.meta.category = subCategory;
                            methodData.meta.path = join(subCategory.dir, `${methodData.name}.mdx`);
                        }
                        data.meta.category = subCategory;
                        data.meta.path = join(subCategory.dir, 'index.mdx');
                    }
                    break;
                }
                case ts.SymbolFlags.Interface: {
                    assert.equal(declarations.length, 1);
                    assert.ok(ts.isInterfaceDeclaration(declarations[ 0 ]));

                    const category = apiSidebar.find(c => c.dir === '/types');

                    data = { ...processClassLikeNode(declarations[ 0 ], symbol), kind: Kind.interface } as InterfaceData;
                    assert.equal(data.methods.length, 0);
                    data.meta.category = category;
                    data.meta.path = join(category.dir, 'types.mdx');
                    data.meta.id = name;
                    break;
                }
                // case ts.SymbolFlags.Class | ts.SymbolFlags.Interface: { // Declaration Merging
                //     assert.ok(declarations.length > 1);
                //     break;
                // }
                case ts.SymbolFlags.TypeAlias: {
                    assert.equal(declarations.length, 1);
                    assert.ok(ts.isTypeAliasDeclaration(declarations[ 0 ]));
                    const node = declarations[ 0 ];

                    const category = apiSidebar.find(c => c.dir === '/types');

                    data = {
                        kind: Kind.type,
                        name,
                        meta: {
                            symbol,
                            category,
                            path: join(category.dir, 'types.mdx'),
                            id: name,
                        },
                        definition: node.type.getText(),
                        jsDoc: processJsDoc(node),
                    };
                    break;
                }
                default: {
                    throw new Error(`Unexpected symbol flags ${symbol.flags}`);
                }
            }

            symbolMap.set(name, data);
        }
    });


    class DocumentationWriter {

        fileOptions: {
            category: SidebarCategory;
            label: string; // label on sidebar
            path: string; // doc file path
            class?: ClassData; // used when documenting class methods with `this` type
        };
        lines: string[] = [];

        constructor(fileOptions: typeof this.fileOptions) {
            this.fileOptions = fileOptions;
        }

        writeRelativeLink(from: string, to: SymbolMetadata) {
            const relativePath = relative(dirname(from), to.path).replace(/\\/g, '/');
            return `${relativePath}${to.id ? `#${to.id}` : ''}`;
        }

        writeRichText(textNodes: JsDocRichTextNode[]) {
            const output = [];
            for (const { text, link } of textNodes) {
                if (link) {
                    let match = symbolMap.get(link);
                    if (!match) {
                        // to handle syntax `Geometry#toJSON`
                        const [ _class, _member ] = link.split('#');
                        match = symbolMap.get(_class);
                        if (match) {
                            assert.equal(match.kind, Kind.class);
                            const matchingMethod = match.methods.find(m => m.name === _member);
                            if (matchingMethod) {
                                match = matchingMethod;
                            } else {
                                const matchingProperty = match.properties.find(m => m.name === _member);
                                if (matchingProperty) {
                                    match = { ...match, meta: { ...match.meta, id: _member } };
                                }
                            }
                        }
                    }
                    if (match && 'meta' in match) {
                        const relativeLink = this.writeRelativeLink(this.fileOptions.path, match.meta);
                        output.push(`[${text === link ? `\`${text}\`` : text}](${relativeLink})`);
                    } else {
                        output.push(`[${text}](${link})`);
                    }
                } else {
                    output.push(text);
                }
            }
            return output.join('');
        }

        // just simple 'number', not 'number[]' or 'Promise<number>'
        writeSimpleType(tsTypeStr: string) {
            const match = symbolMap.get(tsTypeStr);
            if (match) {
                if (match.kind === Kind.basic) {
                    if (match.link) {
                        return `[**\`${tsTypeStr}\`**](${match.link})`;
                    }
                } else {
                    const relativeLink = this.writeRelativeLink(this.fileOptions.path, match.meta);
                    return `[**\`${tsTypeStr}\`**](${relativeLink})`;
                }
            }
            if (tsTypeStr === 'this') {
                assert.ok(this.fileOptions.class);
                const relativeLink = this.writeRelativeLink(this.fileOptions.path, this.fileOptions.class.meta);
                return `[**\`${tsTypeStr}\`**](${relativeLink})`;
            }
            return `**\`${tsTypeStr}\`**`;
        };

        writeValueType = (tsTypeData: TsTypeData) => {
            if (tsTypeData.types) {
                return tsTypeData.types.map(this.writeValueType).join(' \\| '); // `a | b | c`
            }
            if (tsTypeData.tupleElements) { // [ a: number, b: string ]
                const body = tsTypeData.tupleElements.map(el => this.writeValueType(el.type)).join(', ');
                return `**\`[\`** ${body} **\`]\`**`;
            }
            return this.writeSimpleType(tsTypeData.type)
                + (tsTypeData.typeArgs ? `\\<${tsTypeData.typeArgs?.map(this.writeValueType).join(', ')}\\>` : '') // `a<b>`
                + (tsTypeData.array ? `\`${'[]'.repeat(tsTypeData.array)}\`` : ''); // `a[][]`
        };


        writeHeader(data: { name: string }) {
            this.lines.push(`# ${data.name}`, '');
        }

        writeDescription(data: { jsDoc: JsDocData }) {
            const description = data.jsDoc.description;
            if (!description.length) return;

            this.lines.push(this.writeRichText(description), '');
        }


        name_column = {
            header: 'Name',
            format: '---',
            toCell: (tsData: TsParamData, _jsDocData: Pick<JsDocParamData, 'description' | 'default'>) => {
                return `\`${tsData.name}${tsData.optional ? '?' : ''}\``;
            },
        };
        type_column = {
            header: 'Type',
            format: ':-:',
            toCell: (tsData: TsParamData, _jsDocData: Pick<JsDocParamData, 'description' | 'default'>) => {
                return this.writeValueType(tsData.type);
            },
        };
        default_column = {
            header: 'Default',
            format: ':-:',
            toCell: (_tsData: TsParamData, jsDocData: Pick<JsDocParamData, 'description' | 'default'>) => {
                return jsDocData.default && `\`${jsDocData.default}\``;
            },
        };
        description_column = {
            header: 'Description',
            format: '---',
            toCell: (_tsData: TsParamData, jsDocData: Pick<JsDocParamData, 'description' | 'default'>) => {
                const desc = jsDocData.description;
                if (!desc.length) return '';

                const rawLines = this.writeRichText(desc).replace(/^[\s-]*/, '').split('\n');
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

        writeParameters(data: FunctionData) {
            const { name, params, jsDoc, meta } = data;
            if (!params.length) return;

            const defaultColumnNeeded = jsDoc.params.some(p => p.default)
                || params
                    .map(p => symbolMap.get(p.type.type))
                    .some(referencedInterface => (
                        referencedInterface &&
                        referencedInterface.kind === Kind.interface &&
                        referencedInterface.properties.some(m => m.jsDoc.default)
                    ));

            const columns = defaultColumnNeeded
                ? [ this.name_column, this.type_column, this.default_column, this.description_column ]
                : [ this.name_column, this.type_column, this.description_column ];

            this.lines.push('## Parameters', '');
            this.lines.push(`| ${columns.map(c => c.header).join(' | ')} |`);
            this.lines.push(`| ${columns.map(c => c.format).join(' | ')} |`);

            for (const [ i, tsData ] of params.entries()) {
                const jsDocData = jsDoc?.params[ i ];
                if (jsDocData) {
                    assert.equal(tsData.name, jsDocData.name);
                } else {
                    console.warn(`Missing JsDoc for function param ${name} > ${tsData.name}`);
                }

                const referencedType = symbolMap.get(tsData.type.type);
                const referencedInterface = (referencedType && referencedType.kind === Kind.interface) ? referencedType : null;
                if (referencedInterface) {
                    const symbol = referencedInterface.meta.symbol;
                    const declarations: ts.Node[] = meta.symbol.getDeclarations();
                    const allUsages = usageMap.get(symbol);
                    const otherUsages = allUsages
                        .filter(usage => {
                            for (let node = usage; node; node = node.parent) {
                                if (declarations.includes(node)) return false;
                            }
                            return true;
                        });
                    usageMap.set(symbol, otherUsages);
                    tsData.type = { type: 'object' }; // overwrite TS interface name
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
                if (tsData.type.types?.every(t => t.props)) {
                    for (const type of tsData.type.types) {
                        for (const prop of type.props) {
                            const propJsDocData = jsDoc?.params?.find(p => p.name === `${tsData.name}.${prop.name}`);
                            assert.ok(propJsDocData);
                            prop.name = `${tsData.name}.${prop.name}`;
                            this.lines.push(`| ${columns.map(c => c.toCell(prop, propJsDocData)).join(' | ')} |`);
                        }
                    }
                }
            }

            this.lines.push('');
        }

        writeReturns(data: FunctionData) {
            const { returns, jsDoc } = data;
            if (!returns) return;

            this.lines.push('## Returns\n');
            this.lines.push(`${this.writeValueType(returns)}${jsDoc.returns ? ' ' + this.writeRichText(jsDoc.returns) : ''}`);
            this.lines.push('');
        }

        writeThrows(data: FunctionData) {
            const throws = data.jsDoc.throws;
            if (!throws.length) return;

            this.lines.push('## Throws\n');
            for (const throwsData of throws) {
                this.lines.push(`- ${this.writeValueType(throwsData.type)} ${this.writeRichText(throwsData.description)}`);
            }
            this.lines.push('');
        }

        writeSee(data: { jsDoc: JsDocData }) {
            const see = data.jsDoc.see;
            if (!see.length) return;

            this.lines.push('## See also\n');
            for (const seeData of see) {
                this.lines.push(`- ${this.writeRichText(seeData)}`);
            }
            this.lines.push('');
        }

        writeExamples(data: { jsDoc: JsDocData }) {
            const examples = data.jsDoc.examples;
            if (!examples.length) return;

            this.lines.push('## Examples\n');
            for (const { title, code, live } of examples) {
                this.lines.push('```js' + (live ? ' live' : '') + (title ? ` title="${title}"` : ''));
                this.lines.push(code);
                this.lines.push('```', '');
            }
        }

        writePrototypeChain(data: Pick<ClassData, 'name' | 'prototypeChain'>) {
            const { name, prototypeChain } = data;
            if (!prototypeChain.length) return;

            const parentClass = prototypeChain[ 0 ];
            this.lines.push(`\`${name}\` is a subclass of ${this.writeValueType({ type: parentClass })}.`, '');
        }

        writeProperties(data: Pick<ClassData, 'name' | 'properties'>) {
            const { name, properties } = data;
            if (!properties.length) return;

            this.lines.push('## Instance properties', '');
            this.lines.push(`These properties are defined on \`${name}.prototype\` and shared by all \`${name}\` instances.`, '');

            for (const propData of properties) {
                this.lines.push(`### \`${name}.prototype.${propData.name}${propData.optional ? '?' : ''}\` {#${propData.name}}`, '');
                this.lines.push(`<p class='margin-bottom--sm margin-left--md'>Type: ${this.writeValueType(propData.type)}</p>`);
                this.lines.push(`<p class='margin-left--md'>${this.writeRichText(propData.jsDoc.description)}</p>`, '');
            }
        }

        writeMethods(data: Pick<ClassData, 'name' | 'methods'>) {
            const { name, methods } = data;
            if (!methods.length) return;

            this.lines.push('## Instance methods', '');

            for (const methodData of methods) {
                this.lines.push(`### [\`${name}.prototype.${methodData.name}\`](${methodData.name}.mdx) {#${methodData.name}}`, '');
                const fullDescription = this.writeRichText(methodData.jsDoc.description);
                const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
                const firstSentence: any = Array.from(segmenter.segment(fullDescription.replace(/\n/g, ' ')))[ 0 ];
                const shortDescription = firstSentence?.segment.trim() || '';
                this.lines.push(`<p class='margin-left--md'>${shortDescription}</p>`, '');
            }
        }

        async saveToFile() {
            const { category, path, label } = this.fileOptions;

            await DocumentationWriter.createCategoryDirectory(category);
            category.childPositionCounter ??= category.children
                ? category.children.length + 1
                : 1;

            const frontMatterFileMetadata = [
                '---',
                `sidebar_label: '${label}'`,
                `sidebar_position: ${category.childPositionCounter++}`,
                '---',
                '',
            ];

            const fileContent = frontMatterFileMetadata.concat(this.lines).join('\n');
            const filePath = join(DOCS_DIR_PATH, path);
            await writeFile(filePath, fileContent, { encoding: 'utf8' });
            console.log(`${filePath} generated`);
        }

        static CREATED_DIRS = new Set<SidebarCategory>();

        static async createCategoryDirectory(category: SidebarCategory): Promise<void> {
            if (this.CREATED_DIRS.has(category)) return;
            const categoryDir = join(DOCS_DIR_PATH, category.dir);
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

    /** Generate documentation files for functions */
    for (const [ _name, data ] of symbolMap) {
        if (data.kind !== Kind.function) continue;

        const { category, path } = data.meta;
        const writer = new DocumentationWriter({ category, label: data.name, path });
        writer.writeHeader(data);
        writer.writeDescription(data);
        writer.writeParameters(data);
        writer.writeReturns(data);
        writer.writeThrows(data);
        writer.writeSee(data);
        writer.writeExamples(data);
        await writer.saveToFile();
    }

    /** Generate documentation files for classes */
    for (const [ name, data ] of symbolMap) {
        if (data.kind !== Kind.class || data.prototypeChain.includes('Error')) continue;

        const { category, path } = data.meta;
        const writer = new DocumentationWriter({ category, label: data.name, path });
        writer.writeHeader(data);
        writer.writeDescription(data);
        writer.writePrototypeChain(data);
        writer.writeProperties(data);
        writer.writeMethods(data);
        await writer.saveToFile();

        for (const methodData of data.methods) {
            const { category, path } = methodData.meta;
            const writer = new DocumentationWriter({ category, label: methodData.name, path, class: data });
            methodData.name = `${name}.prototype.${methodData.name}`;
            writer.writeHeader(methodData);
            writer.writeDescription(methodData);
            writer.writeParameters(methodData);
            writer.writeReturns(methodData);
            writer.writeThrows(methodData);
            writer.writeSee(methodData);
            writer.writeExamples(methodData);
            await writer.saveToFile();
        }
    }

    /** Generate documentation for errors */
    {
        let writer: DocumentationWriter;
        for (const [ name, data ] of symbolMap) {
            if (data.kind !== Kind.class || !data.prototypeChain.includes('Error')) continue;

            if (!writer) {
                const { category, path } = data.meta;
                writer = new DocumentationWriter({ category, label: 'Errors', path });
                writer.lines.push(`# Errors`, '');
            }

            writer.lines.push(`## \`${name}\` {#${name}}`, '');
            writer.lines.push(`<div class='margin-left--md'>`, '');
            if (data.jsDoc.description?.length) {
                writer.lines.push(writer.writeRichText(data.jsDoc.description), '');
            }
            writer.writePrototypeChain(data);

            if (data.properties.length) {
                writer.lines.push(`### Instance properties`, '');
                // writer.lines.push(`These properties are defined on \`${name}.prototype\` and shared by all \`${name}\` instances.`, '');

                for (const propData of data.properties) {
                    writer.lines.push(`#### \`${name}.prototype.${propData.name}${propData.optional ? '?' : ''}\` {#${propData.name}}`, '');
                    writer.lines.push(`<p class='margin-bottom--sm margin-left--md'>Type: ${writer.writeValueType(propData.type)}</p>`);
                    writer.lines.push(`<p class='margin-left--md'>${writer.writeRichText(propData.jsDoc.description)}</p>`, '');
                }
            }

            writer.lines.push(`</div>`, '');
        }
        await writer.saveToFile();
    }

    /** Generate documentation for types */
    {
        let writer: DocumentationWriter;
        for (const [ name, data ] of symbolMap) {
            if ((data.kind !== Kind.type && data.kind !== Kind.interface)) continue;
            if (!usageMap.get(data.meta.symbol).length) continue;

            if (!writer) {
                const { category, path } = data.meta;
                writer = new DocumentationWriter({ category, label: 'Type Definitions', path });
                writer.lines.push(`# Type Definitions`, '');
            }

            writer.lines.push(`## \`${name}\` {#${name}}`, '');
            writer.lines.push(`<div class='margin-left--md'>`, '');
            if (data.kind === Kind.interface) {
                if (data.properties.length) {
                    writer.lines.push('## Properties', '');

                    for (const propData of data.properties) {
                        writer.lines.push(`### \`${name}.prototype.${propData.name}${propData.optional ? '?' : ''}\` {#${propData.name}}`, '');
                        writer.lines.push(`<div class='margin-left--md'>`, '');
                        writer.lines.push(`Type: ${writer.writeValueType(propData.type)}`, '');
                        writer.lines.push(`${writer.writeRichText(propData.jsDoc.description)}`, '');
                        writer.lines.push(`</div>`, '');
                    }
                }
            } else {
                writer.lines.push(`Definition: \`${data.definition}\``, '');
            }
            writer.lines.push(`</div>`, '');
        }
        await writer?.saveToFile();
    }
}();
