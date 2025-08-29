import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';


/** Header file segments: */

interface CommentSegment {
    type: 'comment';
    lines: string[];
}

interface GroupStartSegment {
    type: 'groupStart';
    name: string;
    desc: string[];
}

interface GroupEndSegment {
    type: 'groupEnd';
}

interface HashSegment {
    type: 'hash';
    text: string;
}

interface ExportedSegment {
    type: 'typedef' | 'enum' | 'extern';
    text: string;
    doc?: CommentSegment;
    group?: GroupStartSegment;
}

type Segment =
    CommentSegment |
    GroupStartSegment |
    GroupEndSegment |
    HashSegment |
    ExportedSegment;


/** From comment documentation: */

interface DocStandardPart {
    type: 'desc' | 'note' | 'warning' | 'returns' | 'since' | 'see' | 'deprecated';
    lines: string[];
}

interface DocParamPart {
    type: 'param';
    ptrType?: 'in' | 'out';
    name: string;
    lines: string[];
}

type DocPart = DocStandardPart | DocParamPart;


/** From code: */

interface EnumMember {
    name: string;
    value: number;
    doc?: string[];
}

interface CType {
    type: string;
    name?: string; // when type is parameter
    ptr?: 0 | 1 | 2;
    const?: boolean;
}

const TYPEDEF_MAP = new Map<string, StructEntry | CallbackEntry>();
const C_TYPES_MAP: Record<string, string> = {
    'char': 'i8',
    'unsigned char': 'u8',
    'int': 'i32',
    'unsigned': 'u32',
    'unsigned int': 'u32',
    'float': 'f32',
    'double': 'f64',
    'size_t': 'u32', // wasm32 target
};

function asTsType(s: CType | CType[]): string {
    if (Array.isArray(s)) {
        if (!s.length) {
            return '';
        }
        return s.map(s => {
            assert.ok(s.name);
            return `${s.name}: ${asTsType(s)}`;
        }).join(', ');
    }
    let type = s.type;
    const ref = TYPEDEF_MAP.get(s.type);
    if (ref?.disguisedPtr) {
        assert.ok(!s.ptr);
        s.ptr = 1;
    }
    if (s.ptr) {
        assert.ok(s.ptr === 1 || s.ptr === 2);
        if (type === 'char') type = `string`;
        else type = C_TYPES_MAP[ type ] || type;
        return `${s.const ? 'Const' : ''}Ptr<${type}${s.ptr === 2 ? '[]' : ''}>`;
    }
    return C_TYPES_MAP[ type ] || type;
}


class HeaderFileParser {

    private typedefs: (StructEntry | CallbackEntry)[] = [];
    private enums: EnumEntry[] = [];
    private functions: FunctionEntry[] = [];

    constructor(headerFileContent: string) {
        const lines: string[] = headerFileContent.split('\n');

        const segments: Segment[] = [];

        /** 1. Roughly segmentize the whole .h file */
        const from = lines.indexOf('extern "C" {');
        const to = lines.lastIndexOf('} // extern "C"');
        for (let i = from + 1; i < to;) {
            let line = lines[ i++ ];
            if (!line) continue;

            line = line.replace(/^\s+/, '');
            if (line.startsWith('/** \\cond ')) {
                // skip lines between \cond - \endcond
                const startIdx = i - 1;
                for (; !line.includes(' \\endcond '); line = lines[ i++ ]) ;
                const endIdx = i;
                const skippedLines = lines.slice(startIdx, endIdx);
                console.log(`skipped ${skippedLines.length} lines; from ${startIdx + 1} to ${endIdx}`);
            } else if (line.startsWith('/*')) {
                const startIdx = i - 1;
                for (; !/\*\/\s*$/.test(line); line = lines[ i++ ]) ;
                const endIdx = i;
                const rawLines = lines.slice(startIdx, endIdx);
                const cLines = this.getCommentBody(rawLines);
                segments.push({ type: 'comment', lines: cLines });
            } else if (line.startsWith('//')) {
                const groupControlChar = line.trim();
                if (groupControlChar === '///@{') {
                    const com = segments.pop();
                    assert.ok(com && com.type === 'comment');
                    assert.match(com.lines[ 0 ], /^@name /);
                    const name = com.lines[ 0 ].slice(6);
                    segments.push({ type: 'groupStart', name, desc: com.lines.slice(1) });
                } else if (groupControlChar === '///@}') {
                    segments.push({ type: 'groupEnd' });
                } else {
                    throw new Error(`Unexpected "//" line: "${line}"`);
                }
            } else if (line.startsWith('#')) {
                segments.push({ type: 'hash', text: line });
            } else {
                const match = line.match(/^(typedef|enum|extern) /);
                if (match) {
                    const type = match[ 1 ] as 'typedef' | 'enum' | 'extern';
                    const startIdx = i - 1;
                    for (; !/;\s*$/.test(line); line = lines[ i++ ]) ;
                    const endIdx = i;
                    const text = lines.slice(startIdx, endIdx).join('\n');
                    const prevSegmentIdx = segments.length - 1;
                    const prev = segments[ prevSegmentIdx ];
                    if (prev && prev.type === 'comment') {
                        segments[ prevSegmentIdx ] = { type, text, doc: prev };
                    } else {
                        console.log(`expected doc is missing; line ${startIdx + 1}`);
                        segments.push({ type, text });
                    }
                } else {
                    if ( // known 'other' lines
                        line !== 'static const size_t GEOS_CLUSTER_NONE = (size_t) -1;'
                    ) {
                        throw new Error(`Unexpected line: "${line}"`);
                    }
                }
            }
        }

        /** 2. Assign to groups and parse signatures */
        let isReentrant = true;
        let group: GroupStartSegment | undefined = undefined;
        for (const segment of segments) {
            switch (segment.type) {
                case 'hash': {
                    if (segment.text === '#ifndef GEOS_USE_ONLY_R_API') {
                        isReentrant = false;
                    } else if (segment.text === '#endif /* #ifndef GEOS_USE_ONLY_R_API */') {
                        isReentrant = true;
                    }
                    break;
                }
                case 'groupStart': {
                    group = segment;
                    break;
                }
                case 'groupEnd': {
                    group = undefined;
                    break;
                }
                case 'typedef': {
                    segment.group = group;
                    const entry = this.processTypedef(segment);
                    this.typedefs.push(entry);
                    break;
                }
                case 'enum': {
                    segment.group = group;
                    const entry = this.processEnum(segment);
                    this.enums.push(entry);
                    break;
                }
                case 'extern': {
                    segment.group = group;
                    const entry = this.processFunction(segment);
                    entry.isReentrant = isReentrant;
                    this.functions.push(entry);
                    break;
                }
            }
        }
    }

    private getCommentBody(lines: string[]) {
        return lines.map((line, i, lines) => {
            const isFirstLine = !i;
            if (isFirstLine) {
                line = line.replace(/^\s*\/\*+\s*/, '');
            }
            const isLastLine = i === lines.length - 1;
            if (isLastLine) {
                line = line.replace(/\s*\*+\/\s*$/, '');
            }
            if (!isFirstLine && !isLastLine) {
                line = line
                    .replace(/^\s*\*+(?: |$)/, '');
            }
            return line;
        });
    }


    private processTypedef(seg: ExportedSegment): StructEntry | CallbackEntry {
        if (seg.text.startsWith('typedef struct ')) {
            const match = seg.text.match(/^typedef struct \w+ (\*)?(\w+);$/);
            assert.ok(match);
            const [ _, ptr, structName ] = match;
            return new StructEntry(seg, structName, ptr ? 1 : 0);
        } else {
            const match = seg.text.match(/^typedef (.*?) \((\*)?(\w+)\)\((.+)\);$/s);
            assert.ok(match);
            let [ _, fnReturnType, ptr, fnName, fnParams ] = match;
            if (fnName === 'GEOSMessageHandler') fnParams = 'const char *fmt'; // hard to parse case
            const returnType = this.processFunctionReturnType(fnReturnType);
            const params = this.processFunctionParams(fnParams);
            return new CallbackEntry(seg, fnName, ptr ? 1 : 0, returnType, params);
        }
    }

    private processEnum(seg: ExportedSegment): EnumEntry {
        const match = seg.text.match(/^enum (\w+)\s*\{(.+)};$/s);
        assert.ok(match);
        const [ _, enumName, enumBody ] = match;
        const members: EnumMember[] = [];
        let doc: string[] | undefined = undefined;
        const lines = enumBody.split('\n');
        for (let i = 0; i < lines.length;) {
            let line = lines[ i++ ];
            if (!line) continue;
            if (/^\s*\/\*/.test(line)) {
                const startIdx = i - 1;
                for (; !/\*\/\s*$/.test(line); line = lines[ i++ ]) ;
                const endIdx = i;
                const rawLines = lines.slice(startIdx, endIdx);
                doc = this.getCommentBody(rawLines);
            } else {
                const mMatch = line.match(/^\s*(\w+)(?:\s*=\s*(\d+))?,?$/);
                assert.ok(mMatch);
                const [ _, n, v ] = mMatch;
                members.push({ name: n, value: v ? +v : members.length, doc });
                doc = undefined;
            }
        }
        return new EnumEntry(seg, enumName, members);
    }

    private processFunction(seg: ExportedSegment): FunctionEntry {
        const match = seg.text.match(/^extern\s+(.+?)\s+GEOS_DLL\s*(\*+)?\s*(\w+)\((.*)\);$/s);
        assert.ok(match);
        const [ _, fnReturnType, ptr, fnName, fnParams ] = match;
        const returnType = this.processFunctionReturnType(`${fnReturnType}${ptr || ''}`);
        const params = this.processFunctionParams(fnParams);
        return new FunctionEntry(seg, fnName, returnType, params);
    }


    private processFunctionReturnType(text: string): CType {
        return this.processFunctionSymbol({ type: text });
    }

    private processFunctionParams(text: string): CType[] {
        const symbols: CType[] = [];
        const params = (text.trim() || 'void').split(/\s*,\s*/s);
        for (const param of params) {
            if (/[\s*]\w+(?:[\[\]]+)?$/.test(param)) {
                let [ _, type, name, arr ] = param.match(/^(.+?)\s?(\w+)(\[])?$/)!;
                if (arr) type = type.replace(/\s?const$/, '') + '*';
                symbols.push({ type, name });
            } else {
                if (param === 'void') {
                    assert.ok(!text || text === param); // skip void param
                } else if (param === 'GEOSContextHandle_t') {
                    symbols.push({ type: param, name: 'handle' });
                } else {
                    symbols.push({ type: param, name: `arg${symbols.length + 1}` });
                }
            }
        }
        return symbols.map(s => this.processFunctionSymbol(s));
    }

    private processFunctionSymbol(s: CType): CType {
        if (s.type.includes('*')) {
            assert.match(s.type, /^[^*]+(\s*\*){1,2}$/);
            s.ptr = 0;
            s.type = s.type.replace(/\s?\*/g, () => (s.ptr!++, ''));
        }
        if (s.type.includes('const')) {
            s.type = s.type.slice(6);
            assert.ok(!s.type.includes('const'));
            s.const = true;
        }
        if (s.type.startsWith('enum ')) {
            s.type = s.type.slice(5);
        }
        return s;
    }


    getTypes(): (StructEntry | CallbackEntry | EnumEntry)[] {
        return [ ...this.typedefs, ...this.enums ];
    }

    getFunctionGroups(): { group: GroupStartSegment; functions: FunctionEntry[]; }[] {
        const functionsMap = new Map(this.functions.map(f => [ f.name, f ]));

        // use groups from regular (non _r) functions (marked with @{ / @} and @name)
        // but use only the reentrant functions (with _r)
        const groupMap = Map.groupBy(this.functions, fn => fn.seg.group);
        const groups = Array.from(groupMap.entries());
        return groups
            .map(([ group, functions ]) => ({
                group,
                functions: (!group || group?.name === 'DEPRECATED')
                    ? functions
                    : functions
                        .map(fn => { // prioritize _r functions:
                            assert.ok(!fn.isReentrant);
                            let fn_r = functionsMap.get(`${fn.name}_r`);
                            assert.ok(fn_r);
                            if (fn_r.seg.group?.name === 'DEPRECATED') {
                                if (fn.name === 'initGEOS') fn_r = functionsMap.get('GEOS_init_r')!;
                                else if (fn.name === 'finishGEOS') fn_r = functionsMap.get('GEOS_finish_r')!;
                                else throw new Error(`unexpectedly deprecated _r function ${fn_r.name} (${fn.name})`);
                                fn_r.alreadyAdded = true;
                                return fn_r;
                            }
                            fn.reentrantVariant = fn_r;
                            fn_r.regularVariant = fn;
                            fn_r.alreadyAdded = true;
                            return fn_r;
                        })
                        .filter((fn): fn is FunctionEntry => Boolean(fn)),
            }))
            .map((g, i, groups) => {
                if (i === 1) {
                    assert.equal(g.group?.name, 'Library and Memory Management');
                    assert.equal(groups[ 0 ].group, undefined);
                    const unassignedFunctionsWithoutGroup = groups[ 0 ].functions
                        .filter(f => !f.alreadyAdded);
                    return { group: g.group!, functions: [ ...g.functions, ...unassignedFunctionsWithoutGroup ] };
                }
                return g as { group: GroupStartSegment; functions: FunctionEntry[]; };
            })
            .slice(1);
    }

}

class TextBuilder {

    private lines: string[] = [];
    private commentMode = false;
    private indentStr = '    ';
    private indent = 0;
    private commentIndent = 0;

    setIndent(indent: number) {
        this.indent = indent;
    }

    withText(text: string, indent = 0) {
        this.closeCommentIfNeeded();
        this.lines.push(this.indentStr.repeat(this.indent + indent) + text);
    }

    withComment(text: string, indent = 0) {
        if (!this.commentMode) {
            this.commentMode = true;
            this.lines.push(this.indentStr.repeat(this.indent + indent) + '/**');
        }
        const lines = text.split('\n');
        for (const line of lines) {
            this.lines.push((this.indentStr.repeat(this.indent + indent) + ' * ' + line).replace(/ +$/, ''));
        }
        this.commentIndent = this.indent + indent;
    }

    private closeCommentIfNeeded() {
        if (this.commentMode) {
            this.lines.push(this.indentStr.repeat(this.commentIndent) + ' */');
            this.commentMode = false;
        }
    }

    toString() {
        this.closeCommentIfNeeded();
        return this.lines.join('\n');
    }

}

abstract class Entry {

    seg: ExportedSegment;
    name: string;
    docParts: DocPart[];
    tb = new TextBuilder();

    protected constructor(seg: ExportedSegment, name: string) {
        this.seg = seg;
        this.name = name;
        this.docParts = this.processDocumentation(seg.doc);
    }

    private processDocumentation(doc?: CommentSegment): DocPart[] {
        if (!doc) return [];
        const parts: DocPart[] = [];
        let part: DocPart = { type: 'desc', lines: [] };
        const lines = doc.lines;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[ i ];
            if (/^\s*@brief/.test(line)) {
                // ignore
            } else if (/^\s*[\\@]param/.test(line)) {
                const match = line.match(/^\s*[\\@]param(\[(?:in|out)])? (\w+)(?:\s+(.+))?$/);
                assert.ok(match);
                const [ _, type, paramName, descLine ] = match;
                const ptrType = type ? type.slice(1, -1) as 'in' | 'out' : undefined;
                parts.push(part);
                part = { type: 'param', name: paramName, ptrType, lines: [ descLine ] };
            } else {
                const match = line.match(/^\s*[\\@](note|warning|returns?|since|see|deprecated)\s+(.+)$/);
                if (match) {
                    let [ _, type, descLine ] = match;
                    if (type === 'return') type = 'returns';
                    parts.push(part);
                    part = { type: type as DocStandardPart['type'], lines: [ descLine ] };
                } else {
                    part.lines.push(!line.trim() ? '' : line);
                }
            }
        }
        parts.push(part);
        return parts;
    }

    protected formatRichText(lines?: string[], inline?: boolean): string {
        if (!lines) return '';
        const text = lines.join('\n')
            .trim()
            .replace(/\\ref (\w+)/g, `{@link $1}`)
            .replace(/\[(.+?)]\((.+?)\)/g, '[$1]{@link $2}');
        if (inline) {
            return text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        }
        return text;
    }

    protected writeDesc(): void {
        const descParts = this.docParts.filter(part => part.type === 'desc');
        const noteParts = this.docParts.filter(part => part.type === 'note');
        const warningParts = this.docParts.filter(part => part.type === 'warning');
        assert.ok(descParts.length <= 1);
        assert.ok(noteParts.length <= 1);
        assert.ok(warningParts.length <= 1);
        const desc = this.formatRichText(descParts[ 0 ]?.lines);
        desc && this.tb.withComment(desc);
        const note = this.formatRichText(noteParts[ 0 ]?.lines);
        note && this.tb.withComment(`Note: ${note}`);
        const warning = this.formatRichText(warningParts[ 0 ]?.lines);
        warning && this.tb.withComment(`Warning: ${warning}`);
    }

    protected writeParams(params: CType[]): void {
        const paramParts = this.docParts.filter(part => part.type === 'param');
        if (!paramParts.length) return;
        assert.equal(paramParts.length, params.length);
        for (const { ptrType, name, lines } of paramParts) {
            const text = this.formatRichText(lines);
            this.tb.withComment(`@param ${name}${ptrType ? ` (${ptrType.slice()})` : ''}${text ? ` - ${text}` : ''}`);
        }
    }

    protected writeReturns(_returnType: CType): void {
        const returnsParts = this.docParts.filter(part => part.type === 'returns');
        if (!returnsParts.length) return;
        assert.equal(returnsParts.length, 1);
        const text = this.formatRichText(returnsParts[ 0 ].lines);
        this.tb.withComment(`@returns ${text}`);
    }

    protected writeSee(): void {
        const seeParts = this.docParts.filter(part => part.type === 'see');
        for (const { lines } of seeParts) {
            const ref = lines.join(' ').trim().replace(/\(\)$/, '');
            this.tb.withComment(`@see ${ref}`);
        }
    }

    abstract toString(exported?: ExportedFunctionsList, indent?: number): string;

}

class StructEntry extends Entry {

    disguisedPtr: number;

    constructor(seg: ExportedSegment, name: string, ptr: number) {
        super(seg, name);
        this.disguisedPtr = ptr;
        TYPEDEF_MAP.set(name, this);
    }

    override toString(): string {
        this.writeDesc();
        this.writeSee();
        this.tb.withText(`export type ${this.name} = '${this.name}';`);
        return this.tb.toString();
    }

}

class CallbackEntry extends Entry {

    disguisedPtr: number;
    returnType: CType;
    params: CType[];

    constructor(seg: ExportedSegment, name: string, ptr: number, returnType: CType, params: CType[]) {
        super(seg, name);
        this.disguisedPtr = ptr;
        this.returnType = returnType;
        this.params = params;
        TYPEDEF_MAP.set(name, this);
    }

    override toString(): string {
        this.writeDesc();
        this.writeParams(this.params);
        this.writeReturns(this.returnType);
        this.writeSee();
        this.tb.withText(`export type ${this.name} = (${asTsType(this.params)}) => ${asTsType(this.returnType)};`);
        return this.tb.toString();
    }

}

class EnumEntry extends Entry {

    members: EnumMember[];

    constructor(seg: ExportedSegment, name: string, members: EnumMember[]) {
        super(seg, name);
        this.members = members;
    }

    override toString(): string {
        this.writeDesc();
        this.writeSee();
        this.tb.withText(`export declare enum ${this.name} {`);
        for (const { name, value, doc } of this.members) {
            const desc = this.formatRichText(doc, true);
            desc && this.tb.withText(`/** ${desc} */`, 1);
            this.tb.withText(`${name} = ${value},`, 1);
        }
        this.tb.withText('}');
        return this.tb.toString();
    }

}

class FunctionEntry extends Entry {

    returnType: CType;
    params: CType[];
    isReentrant: boolean; // determined by `GEOS_USE_ONLY_R_API` scope

    alreadyAdded?: boolean;
    regularVariant?: FunctionEntry; // regular variant of this function
    reentrantVariant?: FunctionEntry; // reentrant variant of this function (with '_r' suffix and ctx param)

    constructor(seg: ExportedSegment, name: string, returnType: CType, params: CType[]) {
        super(seg, name);
        this.returnType = returnType;
        this.params = params;
    }

    override toString(exported?: ExportedFunctionsList, indent?: number): string {
        assert.ok(exported);

        let { name, params, returnType } = this;

        // whether to drop '_r' from its name; only 'GEOS_init_r' and 'initGEOS_r' will keep it
        const shouldTreatAsRegularVariant = this.name.endsWith('_r')
            ? this.regularVariant && this.params[ 0 ]?.type === 'GEOSContextHandle_t'
            : false;
        if (shouldTreatAsRegularVariant) {
            name = name.slice(0, -2);
            params = params.slice(1); // omit 'GEOSContextHandle_t' param
        }

        // '_r' function documentation is usually only a ref to regular variant
        // so use regular variant documentation if possible
        const fn = this.regularVariant || this;
        fn.tb.setIndent(indent || 0);
        fn.writeDesc();
        fn.writeParams(params);
        fn.writeReturns(returnType);
        fn.writeSee();
        if (!exported.get(this.name)?.exported) {
            fn.tb.withComment(`@deprecated this function is not exported`);
        }
        assert.equal(params.length, fn.params.length);
        fn.tb.withText(`${name}(${asTsType(fn.params)}): ${asTsType(fn.returnType)};`);
        return fn.tb.toString();
    }

}


class WasmGEOS {

    private entries: string[] = [];

    addHeader(rootDir: string): void {
        this.entries.push([
            `// Generated by: ${relative(rootDir, import.meta.filename).split(sep).join('/')}`,
            `// based on GEOS C-API header file geos_c.h`,
        ].join('\n'));
    }

    addNumberTypes(): void {
        this.entries.push(
            Array.from(new Set(Object.values(C_TYPES_MAP)))
                .map(tName => `export type ${tName} = number;`)
                .join('\n'),
        );
    }

    addTypeDefinitions(): void {
        this.entries.push([
            `export type Ptr<T> = number & { target: T };`,
            `export type ConstPtr<T> = Ptr<T>;`,
        ].join('\n') + '\n');
    }

    addEntry(entry: Entry, exported?: ExportedFunctionsList, indent?: number): void {
        this.entries.push(entry.toString(exported, indent));
    }

    addLine(text: string): void {
        this.entries.push(text);
    }

    toString(): string {
        return this.entries.join('\n\n');
    }

}

/**
 * To keep functions in `exported_functions.txt` up to date with `geos_c.h`
 * and to know each function `exported` status when generating .ts API
 */
class ExportedFunctionsList extends Map<string, { exported: boolean; comment?: string; }> {

    private lines: string[] = [
        '# list of GEOS C-API functions to be exported from the generated .wasm file',
        `# line with '#' at the beginning is treated as a comment`,
    ];

    constructor(fileContent: string) {
        super();
        const lines = fileContent.split('\n');
        for (let line of lines) {
            line = line.trim();
            const match = line.match(/^([\s#]*)(\w+)(.*)?$/);
            if (match) {
                if (match[ 2 ].includes('GEOS')) {
                    const exported = !match[ 1 ].includes('#');
                    this.set(match[ 2 ], { exported, comment: match[ 3 ] });
                }
            }
        }
    }

    addGroup(group: GroupStartSegment): void {
        this.lines.push(`\n## ${group.name}:`);
    }

    addFunction(fn: FunctionEntry): void {
        const { exported, comment = '' } = this.get(fn.name) || {};
        const prefix = exported ? '' : '#   ';
        this.lines.push(`${prefix}${fn.name}${comment}`);
    }

    toString(): string {
        return this.lines.join('\n') + '\n';
    }

}


void async function main() {
    const { GEOS_VERSION } = process.argv.slice(2)
        .map(arg => arg.split('='))
        .reduce<Record<string, string>>((acc, [ k, v ]) => ({ ...acc, [ k ]: v }), {});

    assert.ok(GEOS_VERSION);
    const ROOT_DIR = join(import.meta.dirname, '../../..');
    const EXPORTED_FUNCTIONS_TXT_PATH = join(ROOT_DIR, './cpp/exported_functions.txt');
    const GEOS_CAPI_HEADER_FILE_PATH = join(ROOT_DIR, `./cpp/build/native/src/geos-${GEOS_VERSION}/capi/geos_c.h.in`);
    const WASM_GEOS_MTS_PATH = join(ROOT_DIR, './src/core/types/WasmGEOS.mts');

    const exportedFunctionsFileContent = await readFile(EXPORTED_FUNCTIONS_TXT_PATH, { encoding: 'utf8' });
    const headerFileContent = await readFile(GEOS_CAPI_HEADER_FILE_PATH, { encoding: 'utf8' });

    const exported = new ExportedFunctionsList(exportedFunctionsFileContent);
    const parser = new HeaderFileParser(headerFileContent);
    const wasmGEOS = new WasmGEOS();


    wasmGEOS.addHeader(ROOT_DIR);
    wasmGEOS.addNumberTypes();
    wasmGEOS.addTypeDefinitions();
    for (const entry of parser.getTypes()) {
        wasmGEOS.addEntry(entry);
    }

    wasmGEOS.addLine('export interface WasmGEOS {');
    for (const { group, functions } of parser.getFunctionGroups()) {
        exported.addGroup(group);
        for (const entry of functions) {
            exported.addFunction(entry);
            if (group.name !== 'DEPRECATED') {
                wasmGEOS.addEntry(entry, exported, 1);
            }
        }
    }
    wasmGEOS.addLine('}\n');

    {
        const current = exportedFunctionsFileContent;
        const updated = exported.toString();
        if (current !== updated) {
            await writeFile(EXPORTED_FUNCTIONS_TXT_PATH, updated, { encoding: 'utf8' });
            console.log(`${EXPORTED_FUNCTIONS_TXT_PATH} file updated`);
        } else {
            console.log(`${EXPORTED_FUNCTIONS_TXT_PATH} no changes`);
        }
    }
    {
        const current = await readFile(WASM_GEOS_MTS_PATH, { encoding: 'utf8' });
        const updated = wasmGEOS.toString();
        if (current !== updated) {
            await writeFile(WASM_GEOS_MTS_PATH, updated, { encoding: 'utf8' });
            console.log(`${WASM_GEOS_MTS_PATH} file updated`);
        } else {
            console.log(`${WASM_GEOS_MTS_PATH} no changes`);
        }
    }
}();
