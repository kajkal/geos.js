import assert from 'node:assert/strict';
import process from 'node:process';
import { join, relative, sep } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { NodeType, parse, TextNode } from 'node-html-parser';


function txt(el, selector) {
    if (selector) {
        el = el.querySelector(selector);
    }
    assert.ok(el);
    return el.textContent.trim();
}

const INDENT_STR = '    ';

class TextBuilder {

    lines = [];
    commentMode = false;
    #indent = 0;
    #commentIndent = 0;

    setIndent(indent) {
        this.#indent = indent;
    }

    line(line, indent = 0) {
        this.#closeCommentIfNeeded();
        this.lines.push(INDENT_STR.repeat(this.#indent + indent) + line);
    }

    comment(text, indent = 0) {
        if (!this.commentMode) {
            this.commentMode = true;
            this.lines.push(INDENT_STR.repeat(this.#indent + indent) + '/**');
        }
        this.lines.push((INDENT_STR.repeat(this.#indent + indent) + ' * ' + text).replace(/ +$/, ''));
        this.#commentIndent = this.#indent + indent;
    }

    #closeCommentIfNeeded() {
        if (this.commentMode) {
            this.lines.push(INDENT_STR.repeat(this.#commentIndent) + ' */');
            this.commentMode = false;
        }
    }

    build() {
        this.#closeCommentIfNeeded();
        return this.lines.join('\n');
    }

}

class Mem {

    constructor(title, body) {
        this.title = title;
        this.body = body;
        this.tb = new TextBuilder();
    }

    processDesc() {
        const { body, tb } = this;
        const descriptions = body.querySelectorAll('.memdoc>p,.memdoc>ul');
        for (const desc of descriptions) {
            if (desc.rawTagName === 'ul') {
                for (const item of desc.querySelectorAll('li')) {
                    tb.comment(`- ${txt(item)}`);
                }
            } else {
                tb.comment(this.#parseRichText(desc));
            }
        }
        const ddNote = body.querySelector('.memdoc>.note>dd');
        if (ddNote) {
            tb.comment(`Note: ${this.#parseRichText(ddNote)}`);
        }
        const deprecated = body.querySelector('.memdoc>.deprecated>dd');
        if (deprecated) {
            this.deprecated = true;
            tb.comment(`@deprecated ${this.#parseRichText(deprecated)}`);
        }
    }

    #parseRichText(el) {
        const { tb } = this;
        let line = '';
        for (const n of el.childNodes) {
            const text = n.textContent;
            if (n.nodeType === NodeType.TEXT_NODE) {
                if (text.startsWith('\n')) tb.comment(line), line = text.slice(1);
                else line += text;
            } else {
                assert.equal(n.nodeType, NodeType.ELEMENT_NODE);
                if (n.rawTagName === 'a') {
                    const { href } = n.attrs;
                    if (href.startsWith('geos__c_8h.html#')) line += `{@link ${text}}`;
                    else line += `{@link ${href}|${text}}`;
                }
                else if (n.rawTagName === 'code') line += `\`${text}\``;
                else if (n.rawTagName === 'em') line += `_${text}_`;
                else if (n.rawTagName === 'b') line += `**${text}**`;
                else assert.equal(n.rawTagName, 'br');
            }
        }
        return line;
    }

    processParams(args) {
        const { body, tb } = this;
        const dlParams = body.querySelector('.memdoc>.params');
        if (dlParams) {
            const rows = dlParams.querySelectorAll('tr');
            assert.equal(rows.length, args.length);
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                assert.ok(cells.length === 3 || cells.length === 2);
                let ptrType, name, desc;
                if (cells.length === 3) {
                    [ ptrType, name, desc ] = cells.map(el => txt(el));
                    assert.ok(ptrType === '' || ptrType === '[in]' || ptrType === '[out]');
                    ptrType = ptrType && ptrType.slice(1, -1);
                } else {
                    [ name, desc ] = cells.map(el => txt(el));
                }
                tb.comment(`@param ${name}${ptrType ? ` (${ptrType.slice()})` : ''}${desc ? ` - ${desc}` : ''}`);
            }
        }
    }

    processReturns(_returnType) {
        const { body, tb } = this;
        const dlReturn = body.querySelector('.memdoc>.return');
        if (dlReturn) {
            const ddReturn = txt(dlReturn, 'dd');
            assert.ok(ddReturn);
            tb.comment(`@returns ${ddReturn}`);
        }
    }

    processSee() {
        const { body, tb } = this;
        const dlSee = body.querySelector('.memdoc>.see');
        if (dlSee) {
            for (const link of dlSee.querySelectorAll('a')) {
                tb.comment(`@see ${txt(link)}`);
            }
        }
    }

}


/**
 * @typedef {Object} Symbol
 * @property {string} type
 * @property {string} [name] - arg name
 * @property {string} [id] - link id
 * @property {1|2} [ptr] - whether '*' or '**'
 * @property {true} [const] - whether const ptr or not
 * @property {Symbol} [reentrantVariant] - reentrant variant of this function (for regular functions - with default context)
 * @property {Symbol} [regularVariant] - regular variant of this function (for reentrant functions - with explicit context)
 */

/**
 * @param {*} td
 * @param {Set<string>} [disguisedPointerTypes]
 * @returns {Symbol[]}
 */
function processFunctionSymbols(td, disguisedPointerTypes) {
    const symbols = [];

    const text = txt(td);
    const match = text.match(/^(\S+) \((.*)\)$/);
    if (match) {
        const [ _, fnName, args ] = match;
        symbols.push({ type: fnName });
        for (const arg of (args || 'void').split(', ')) {
            if (arg.includes(' ')) {
                let [ _, type, name, arr ] = arg.match(/^(.+?)\s?(\w+)(\[])?$/);
                if (arr) type = type.replace(/\s?const$/, '') + '*';
                symbols.push({ type, name });
            } else {
                symbols.push({ type: arg });
            }
        }
    } else {
        symbols.push({ type: text });
    }

    for (const s of symbols) {
        if (s.type.includes('*')) {
            assert.ok(/^[^*]+ \*{1,2}$/.test(s.type));
            s.ptr = 0;
            s.type = s.type.replace(/\s?\*/g, () => (s.ptr++, ''));
        }
        if (s.type.includes('const')) {
            s.type = s.type.slice(6);
            assert.ok(!s.type.includes('const'));
            s.const = true;
        }
        if (disguisedPointerTypes?.has(s.type)) {
            assert.ok(!s.ptr);
            s.ptr = 1;
        }
    }

    for (const link of td.querySelectorAll('a')) {
        const href = link.attrs.href;
        assert.ok(href.startsWith('geos__c_8h.html#'));
        const id = href.slice(16);
        const name = txt(link);
        for (const s of symbols) {
            if (s.type === name) {
                assert.ok(!s.id || s.id === id);
                s.id = id;
            }
        }
    }

    return symbols;
}

class FunctionSignature {
    constructor(name, args, returnType) {
        this.name = name;
        this.args = args;
        this.returnType = returnType;
    }
}


const cTypesMap = {
    'char': 'i8',
    'unsigned char': 'u8',
    'int': 'i32',
    'unsigned int': 'u32',
    'double': 'f64',
    'size_t': 'u32',
};

/**
 * @param {Symbol | Symbol[]} s
 * @returns string
 */
function asJsType(s) {
    if (Array.isArray(s)) {
        if (s.length === 0 || (s.length === 1 && JSON.stringify(s[ 0 ]) === '{"type":"void"}')) {
            return '';
        }
        return s.map(s => {
            assert.ok(s.name);
            return `${s.name}: ${asJsType(s)}`;
        }).join(', ');
    }
    let type = s.type;
    if (type.startsWith('enum ')) type = type.slice(5);
    if (s.ptr) {
        if (type === 'char') type = `string`;
        else type = cTypesMap[ type ] || type;
        return `${s.const ? 'Const' : ''}Ptr<${type}${s.ptr === 2 ? '[]' : ''}>`;
    }
    return cTypesMap[ type ] || type;
}


void async function main() {
    const { GEOS_VERSION } = process.argv.slice(2)
        .map(arg => arg.split('='))
        .reduce((acc, [ k, v ]) => ({ ...acc, [ k ]: v }), {});

    const ROOT_DIR = join(import.meta.dirname, '../../..');
    const GEOS_DOCS_FILE_PATH = join(ROOT_DIR, `./cpp/build/native/src/geos-${GEOS_VERSION}/doxygen/doxygen_docs/html/geos__c_8h.html`);
    const EXPORTED_FUNCTIONS_TXT_PATH = join(ROOT_DIR, './cpp/exported_functions.txt');
    const WASM_GEOS_MTS_PATH = join(ROOT_DIR, './src/types/wasm-geos.mts');


    const expFunctionsLines = [
        '# list of GEOS C-API functions to be exported from the generated .wasm file',
        `# line with '#' at the beginning is treated as a comment`,
    ];
    const expFunctionsMap = await readFile(EXPORTED_FUNCTIONS_TXT_PATH, { encoding: 'utf8' })
        .then(txt => txt.split('\n')
            .map(line => line.trim())
            .reduce((map, line) => {
                const exported = !line.startsWith('#');
                const fnName = line.replace(/^#\s*/, '');
                return map.set(fnName, { exported });
            }, new Map()),
        );

    const root = await readFile(GEOS_DOCS_FILE_PATH, { encoding: 'utf8' })
        .then(html => parse(html));

    const documentation = {
        header: [ [
            `// Generated by: ${relative(ROOT_DIR, import.meta.filename).split(sep).join('/')}`,
            '',
            ...new Set(Object.values(cTypesMap)).keys().map(tName => `export type ${tName} = number;`),
            '',
            `export type Ptr<T> = number & { target: T };`,
            `export type ConstPtr<T> = Ptr<T>;`,
        ].join('\n') + '\n' ],
        typedefs: [],
        enums: [],
        functions: [],
    };

    const idMemMap = new Map();

    /** collect mem entries */
    {
        const sections = root.querySelectorAll('.contents>h2.groupheader')
            .map(el => ({ el, from: el.parentNode.childNodes.indexOf(el) }))
            .map(({ el, from }, i, arr) => {
                const to = i + 1 < arr.length ? arr[ i + 1 ].from : Infinity;
                const nodes = el.parentNode.childNodes.slice(from + 1, to)
                    .filter(el => el.childNodes.length || el.rawTagName);
                return { el, nodes };
            });
        assert.equal(sections.length, 4);
        assert.equal(txt(sections[ 0 ].el), 'Detailed Description');
        assert.equal(txt(sections[ 1 ].el), 'Typedef Documentation');
        assert.equal(txt(sections[ 2 ].el), 'Enumeration Type Documentation');
        assert.equal(txt(sections[ 3 ].el), 'Function Documentation');

        for (const { nodes } of sections.slice(1)) {
            for (let i = 0; i < nodes.length; i++) {
                const link = nodes[ i ];
                assert.equal(link.rawTagName, 'a');
                const header = nodes[ ++i ];
                assert.equal(header.classNames, 'memtitle');
                header.childNodes[ 0 ].remove(); // remove "◆"
                const body = nodes[ ++i ];
                assert.equal(body.classNames, 'memitem');

                const id = link.attrs.id;
                assert.ok(!idMemMap.has(id));
                const title = txt(header);
                idMemMap.set(id, new Mem(title, body));

                // invalid formatting fix:
                if (title === 'GEOSOffsetCurve()') {
                    const invalidListItem = body.querySelector('li:last-child');
                    assert.equal(invalidListItem.childNodes.length, 9);
                    const parent = body.querySelector('.memdoc');
                    for (let j = 1; j < invalidListItem.childNodes.length; j++) {
                        const nodeToMove = invalidListItem.childNodes[ j ];
                        parent.appendChild(nodeToMove);
                        invalidListItem.removeChild(nodeToMove);
                    }
                }
            }
        }
    }


    const tables = root.querySelectorAll('table.memberdecls');
    assert.equal(tables.length, 4);
    assert.equal(txt(tables[ 0 ], 'h2'), 'Typedefs');
    assert.equal(txt(tables[ 1 ], 'h2'), 'Enumerations');
    assert.equal(txt(tables[ 2 ], 'h2'), 'Functions');
    assert.equal(txt(tables[ 3 ], 'h2'), 'Geometric Constructions');

    /** process typedefs table */
    const disguisedPointerTypes = new Set();
    const replaceTxtChild = (parent, oldTxt, newTxt) => parent.exchangeChild(oldTxt, new TextNode(newTxt, parent));
    for (const tr of tables[ 0 ].querySelectorAll('tr')) {
        if (!tr.classNames.startsWith('memitem:')) continue;
        assert.equal(tr.childElementCount, 2);
        const [ left, right ] = tr.childNodes;
        assert.equal(left.classNames, 'memItemLeft');
        assert.equal(right.classNames, 'memItemRight');
        let typedef, id;

        const leftTxt = txt(left);
        const asPtr = leftTxt.endsWith('*');
        if (leftTxt.startsWith('typedef struct ')) {
            const res = processFunctionSymbols(right);
            assert.equal(res.length, 1);
            typedef = res[ 0 ];
            id = typedef.id;
        } else {
            assert.equal(right.childNodes.length, 2);
            const rightTxtRaw = txt(right);

            if (rightTxtRaw.startsWith('GEOSMessageHandler)')) {
                replaceTxtChild(right, right.childNodes[ 1 ], '(const char *fmt)');
            } else if (rightTxtRaw.startsWith('GEOSMessageHandler_r)')) {
                replaceTxtChild(left, left.childNodes[ 0 ], 'typedef void(*');
            }

            replaceTxtChild(left, left.childNodes[ 0 ], txt(left).replace(/^typedef /, '').replace(/[*()]+$/, ''));
            replaceTxtChild(right, right.childNodes[ 1 ], txt(right.childNodes[ 1 ]).replace(/^\)?\s?/, ' '));
            const returnType = processFunctionSymbols(left);
            assert.equal(returnType.length, 1);
            const [ name, ...args ] = processFunctionSymbols(right);
            typedef = new FunctionSignature(name, args, returnType[ 0 ]);
            id = typedef.name.id;
        }

        if (asPtr) {
            disguisedPointerTypes.add(typedef.type || typedef.name.type);
        }

        const mem = idMemMap.get(id);
        assert.equal(mem.tb.lines.length, 0);
        mem.processDesc();
        if (typedef instanceof FunctionSignature) {
            mem.processParams(typedef.args);
            mem.processReturns(typedef.returnType);
            mem.processSee();
            mem.tb.line(`export type ${typedef.name.type} = (${asJsType(typedef.args)}) => ${asJsType(typedef.returnType)};`);
        } else {
            mem.processSee();
            mem.tb.line(`export type ${typedef.type} = '${typedef.type}';`);
        }
        documentation.typedefs.push(mem.tb.build());
    }

    /** process enumerations table */
    const processEnum = (tr) => {
        assert.equal(tr.childElementCount, 2);
        const [ left, right ] = tr.childNodes;
        assert.equal(left.classNames, 'memItemLeft');
        assert.equal(right.classNames, 'memItemRight');
        assert.equal(txt(left), 'enum');

        const members = right.textContent
            .split(/\s*[}{,]\s*/)
            .filter(Boolean)
            .map((s, i) => {
                const [ name, v ] = s.split(' = ');
                return { name, value: v ? +v : i - 1 };
            });
        const { name } = members.shift();
        const membersMap = Object.fromEntries(members.map(s => [ s.name, s ]));

        const nameLink = right.querySelector('a');
        assert.equal(txt(nameLink), name);
        const href = right.querySelector('a').attrs.href;
        assert.ok(href.startsWith('geos__c_8h.html#'));
        const mem = idMemMap.get(href.slice(16));
        assert.equal(mem.tb.lines.length, 0);
        mem.processDesc();
        mem.processSee();
        for (const tr of mem.body.querySelectorAll('.memdoc>.fieldtable tr:has(td)')) {
            const member = membersMap[ txt(tr, '.fieldname') ];
            member.comment = txt(tr, '.fielddoc');
        }
        mem.tb.line(`export declare enum ${name} {`);
        for (const { name, value, comment } of members) {
            comment && mem.tb.line(`/** ${comment} */`, 1);
            mem.tb.line(`${name} = ${value},`, 1);
        }
        mem.tb.line('}');
        documentation.enums.push(mem.tb.build());
    };
    for (const tr of tables[ 1 ].querySelectorAll('tr')) {
        if (!tr.classNames.startsWith('memitem:')) continue;
        processEnum(tr);
    }

    /** process functions */
    {
        const groups = [];
        let group;

        for (const idx of [ 2, 3 ]) {
            const rows = tables[ idx ].querySelectorAll('tr');
            for (let i = 0; i < rows.length; i++) {
                const tr = rows[ i ];
                if (!group) {
                    group = { name: txt(tr, '.groupheader'), functions: [] };
                    continue;
                }
                if (tr.classNames.startsWith('separator:')) continue;
                if (tr.classNames.startsWith('memitem:')) {
                    assert.equal(tr.childElementCount, 2);
                    const left = tr.childNodes[ 0 ];
                    if (txt(left) === 'enum') {
                        processEnum(tr);
                        continue;
                    }
                    let returnType = processFunctionSymbols(left, disguisedPointerTypes);
                    assert.equal(returnType.length, 1);
                    const right = tr.childNodes[ 1 ];
                    const [ name, ...args ] = processFunctionSymbols(right, disguisedPointerTypes);
                    group.functions.push(new FunctionSignature(name, args, returnType[ 0 ]));
                    continue;
                }
                const groupHeader = txt(tr, '.groupHeader,.groupheader');
                const groupText = txt(tr.nextElementSibling, '.groupText,.ititle');
                groups.push(group);
                group = { name: groupHeader, descriptions: groupText, functions: [] };
                i++;
            }
        }
        groups.push(group);

        // sort functions from the first group
        const group0Functions = groups[ 0 ].functions;
        const group0FunctionsCopy = Array.from(group0Functions);
        const otherGroups = groups.slice(1);
        for (const fn of group0FunctionsCopy) {
            search: for (const { functions } of otherGroups) {
                for (let i = 0; i < functions.length; i++) {
                    const _fn = functions[ i ];
                    if (fn.name.type === _fn.name.type + '_r') {
                        fn.regularVariant = _fn;
                        _fn.reentrantVariant = fn;
                        // insert `_r` function after its `standard` version
                        const removed = group0Functions.splice(group0Functions.indexOf(fn), 1);
                        functions.splice(i + 1, 0, ...removed);
                        break search;
                    }
                }
            }
        }

        documentation.functions.push('export interface WasmGEOS {');
        for (const group of groups) {
            expFunctionsLines.push(`\n## ${group.name}:`);
            for (const fn of group.functions) {
                const fnName = fn.name.type;
                let expFunctionsEntry = expFunctionsMap.get(fnName);
                if (fn.reentrantVariant) {
                    expFunctionsEntry = expFunctionsMap.get(fn.reentrantVariant.name.type);
                } else {
                    expFunctionsLines.push(expFunctionsEntry?.exported ? fnName : `#   ${fnName}`);
                }
                let mem = idMemMap.get(fn.name.id);
                assert.equal(mem.tb.lines.length, 0);
                mem.tb.setIndent(1);
                mem.processDesc();
                mem.processParams(fn.args);
                mem.processReturns(fn.returnType);
                mem.processSee();
                if (mem.deprecated || fn.regularVariant) { // ignore deprecated functions and not `_r` functions
                    continue;
                }
                if (!expFunctionsEntry?.exported) {
                    mem.tb.comment(`@deprecated this function is not exported`);
                }
                mem.tb.line(`${fnName}(${asJsType(fn.args)}): ${asJsType(fn.returnType)};`);
                documentation.functions.push(mem.tb.build());
            }
        }
        documentation.functions.push('}\n');
    }

    {
        const current = await readFile(EXPORTED_FUNCTIONS_TXT_PATH, { encoding: 'utf8' });
        const updated = expFunctionsLines.join('\n') + '\n';
        if (current !== updated) {
            await writeFile(EXPORTED_FUNCTIONS_TXT_PATH, updated, { encoding: 'utf8' });
            console.log(`${EXPORTED_FUNCTIONS_TXT_PATH} file updated`);
        } else {
            console.log(`${EXPORTED_FUNCTIONS_TXT_PATH} no changes`);
        }
    }
    {
        const current = await readFile(WASM_GEOS_MTS_PATH, { encoding: 'utf8' });
        const updated = Object.values(documentation).flat().join('\n\n');
        if (current !== updated) {
            await writeFile(WASM_GEOS_MTS_PATH, updated, { encoding: 'utf8' });
            console.log(`${WASM_GEOS_MTS_PATH} file updated`);
        } else {
            console.log(`${WASM_GEOS_MTS_PATH} no changes`);
        }
    }
}();
