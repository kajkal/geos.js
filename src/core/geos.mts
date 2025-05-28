import type { GEOSBufferParams, GEOSMakeValidParams, GEOSMessageHandler_r, GEOSWKBReader, GEOSWKBWriter, GEOSWKTReader, GEOSWKTWriter, Ptr, WasmGEOS } from './types/WasmGEOS.mjs';
import type { WasmOther } from './types/WasmOther.mjs';
import { POINTER } from './symbols.mjs';
import { ReusableBuffer, ReusableF64, ReusableU32 } from './reusable-memory.mjs';
import { GEOSError } from './GEOSError.mjs';
import { initialize } from '../index.mjs';


class GEOS {

    /* WASM: memory */

    memory: WebAssembly.Memory;
    U8: Uint8Array;
    U32: Uint32Array;
    F64: Float64Array;

    buff: ReusableBuffer;

    u1: ReusableU32;
    u2: ReusableU32;

    f1: ReusableF64;
    f2: ReusableF64;
    f3: ReusableF64;
    f4: ReusableF64;

    updateMemory(): void {
        const ab = this.memory.buffer;
        this.U8 = new Uint8Array(ab);
        this.U32 = new Uint32Array(ab);
        this.F64 = new Float64Array(ab);
    }

    buffByL(l: number): ReusableBuffer {
        let { buff } = this;
        if (l > buff.l) {
            const tmpBuffPtr = (this as unknown as WasmOther).malloc(l);
            buff = new ReusableBuffer(tmpBuffPtr, l);
        }
        return buff;
    }

    buffByL4(l4: number): ReusableBuffer {
        let { buff } = this;
        if (l4 > buff.l4) {
            const tmpBuffLen = l4 * 4;
            const tmpBuffPtr = (this as unknown as WasmOther).malloc(tmpBuffLen);
            buff = new ReusableBuffer(tmpBuffPtr, tmpBuffLen);
        }
        return buff;
    }


    /* WASM: strings */

    td: TextDecoder = new TextDecoder();
    te: TextEncoder = new TextEncoder();

    encodeString(str: string): ReusableBuffer {
        const strLen = str.length;
        const buff = this.buffByL(strLen + 1);
        const idx = buff[ POINTER ];
        const dst = this.U8.subarray(idx, idx + strLen + 1);
        const stats = this.te.encodeInto(str, dst);
        if (stats.written !== strLen) {
            // geos related strings are expected to be simple 1 byte utf8
            throw new GEOSError('Unexpected string encoding result');
        }
        dst[ strLen ] = 0;
        return buff;
    }

    decodeString(ptr: Ptr<string>): string {
        const startIdx = ptr >>> 0;
        const src = this.U8;
        let endIdx = startIdx;
        while (src[ endIdx ]) endIdx++;
        return this.td.decode(src.subarray(startIdx, endIdx));
    }


    /* WASM: table */

    table: WebAssembly.Table;
    functionsInTableMap: Map<SimpleFunction, /* fnIdx: */number> = new Map();
    freeTableIndexes: number[] = [];

    addFunction<T extends SimpleFunction>(fn: T, sig: string): Ptr<T> {
        let fnIdx = this.functionsInTableMap.get(fn);
        if (fnIdx) {
            return fnIdx as Ptr<T>;
        }

        fnIdx = this.freeTableIndexes.length
            ? this.freeTableIndexes.pop()
            : this.table.grow(1);

        const asWasmFn = convertJsFunctionToWasm(fn, sig);
        this.table.set(fnIdx, asWasmFn);
        this.functionsInTableMap.set(fn, fnIdx);
        return fnIdx as Ptr<T>;
    };

    removeFunction(fn: SimpleFunction): void {
        const fnIdx = this.functionsInTableMap.get(fn);
        if (fnIdx) {
            this.table.set(fnIdx, null);
            this.functionsInTableMap.delete(this.table.get(fnIdx));
            this.freeTableIndexes.push(fnIdx);
        }
    }


    /* GEOS */

    t_r: Record<null | string, Ptr<GEOSWKTReader>> = {};
    t_w: Record<null | string, Ptr<GEOSWKTWriter>> = {};
    b_r: Record<null | string, Ptr<GEOSWKBReader>> = {};
    b_w: Record<null | string, Ptr<GEOSWKBWriter>> = {};
    b_p: Record<null | string, Ptr<GEOSBufferParams>> = {};
    m_v: Record<null | string, Ptr<GEOSMakeValidParams>> = {};

    onGEOSError: GEOSMessageHandler_r = (messagePtr, _userdata) => {
        const message = this.decodeString(messagePtr);
        const error = new GEOSError(message);
        const sepIdx = message.indexOf(': ');
        if (sepIdx > 0) {
            error.name = `${error.name}::${message.slice(0, sepIdx)}`;
            error.message = message.slice(sepIdx + 2);
        }
        throw error;
    };

    constructor(instance: WebAssembly.Instance) {
        interface WasmExports extends WasmGEOS, WasmOther {
            memory: WebAssembly.Memory;
            __indirect_function_table: WebAssembly.Table;
        }

        const { memory, __indirect_function_table, ...exports } = instance.exports as unknown as WasmExports;

        this.memory = memory;
        this.updateMemory();

        this.table = __indirect_function_table;

        exports._initialize();
        const ctx = exports.GEOS_init_r();
        exports.GEOSContext_setErrorMessageHandler_r(ctx, this.addFunction(this.onGEOSError, 'vpp'), 0 as Ptr<void>);

        // bind ctx to all `_r` functions and remove `_r` from their name:
        for (const fnName in exports) {
            if (fnName.endsWith('_r')) {
                this[ fnName.slice(0, -2) ] = exports[ fnName ].bind(null, ctx);
            } else {
                this[ fnName ] = exports[ fnName ];
            }
        }

        const buffLen = 4096; // 4KB
        let ptr: number = exports.malloc(
            buffLen + // buff
            2 * 4 + // u32s
            4 * 8, // f64s
        );
        this.buff = new ReusableBuffer(ptr, buffLen);
        this.u1 = new ReusableU32(ptr += buffLen);
        this.u2 = new ReusableU32(ptr += 4);
        this.f1 = new ReusableF64(ptr += 4);
        this.f2 = new ReusableF64(ptr += 8);
        this.f3 = new ReusableF64(ptr += 8);
        this.f4 = new ReusableF64(ptr + 8);
    }

}


type SimpleFunction = (...args: number[]) => number | void; // function callable by wasm - only numeric args/return

const convertJsFunctionToWasm = (fn: SimpleFunction, sig: string) => {
    const typeSectionBody = [ 1, 96 ];
    const sigRet = sig.slice(0, 1);
    const sigParam = sig.slice(1);
    const typeCodes = {
        i: 127, // i32
        p: 127, // i32
        j: 126, // i64
        f: 125, // f32
        d: 124, // f64
    };
    uleb128Encode(sigParam.length, typeSectionBody);
    for (const paramType of sigParam) {
        typeSectionBody.push(typeCodes[ paramType ]);
    }
    if (sigRet === 'v') {
        typeSectionBody.push(0);
    } else {
        typeSectionBody.push(1, typeCodes[ sigRet ]);
    }
    const bytes = [ 0, 97, 115, 109, 1, 0, 0, 0, 1 ];
    uleb128Encode(typeSectionBody.length, bytes);
    bytes.push(...typeSectionBody);
    bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
    const module = new WebAssembly.Module(new Uint8Array(bytes));
    const instance = new WebAssembly.Instance(module, { e: { f: fn } });
    return instance.exports.f;
};

const uleb128Encode = (n: number, target: number[]): void => {
    if (n < 128) {
        target.push(n);
    } else {
        target.push((n % 128) | 128, n >> 7);
    }
};


const imports = {
    env: {
        emscripten_notify_memory_growth() {
            // memory growth linear step:
            const growStep = 256; // 256 * 64KB = 16MB
            const currentPageCount = geos.memory.buffer.byteLength / 65536;
            const pagesToGrow = growStep - (currentPageCount % growStep);
            geos.memory.grow(pagesToGrow);
            geos.updateMemory();
        },
    },
    wasi_snapshot_preview1: {
        random_get(buffer: number, size: number) {
            crypto.getRandomValues(geos.U8.subarray(buffer >>>= 0, buffer + size >>> 0));
            return 0;
        },
    },
};


const geosPlaceholder = new Proxy({}, {
    get(_, property) {
        if ((property as string).endsWith('destroy')) {
            // silently ignore GEOS destroy calls after `terminate` call
            return () => 0;
        }
        throw new GEOSError('GEOS.js not initialized');
    },
}) as unknown as typeof geos;

export let geos: GEOS & WasmGEOS & WasmOther = geosPlaceholder;


export async function instantiate(source: Response | Promise<Response> | WebAssembly.Module): Promise<WebAssembly.Module> {
    let module: WebAssembly.Module;
    let instance: WebAssembly.Instance;
    if (source instanceof WebAssembly.Module) {
        module = source;
        instance = await WebAssembly.instantiate(source, imports);
    } else {
        ({ module, instance } = await WebAssembly.instantiateStreaming(source, imports));
    }
    geos = new GEOS(instance) as typeof geos;
    return module;
}


/**
 * Terminates the initialized `geos.js` module and releases associated resources.
 *
 * @returns A Promise that resolves when the termination is complete
 *
 * @see {@link initializeFromBase64}
 * @see {@link initialize}
 */
export async function terminate(): Promise<void> {
    if (geos !== geosPlaceholder) {
        geos = geosPlaceholder; // gc will do the rest
    }
}
