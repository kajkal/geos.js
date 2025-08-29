import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { initialize } from '../src/index.mjs';


export const GEOS_JS_WASM_PATH: string = join(import.meta.dirname, '../cpp/build/js/geos_js.wasm');

export async function initializeForTest(): Promise<void> {
    const wasmData = await readFile(GEOS_JS_WASM_PATH);
    const module = await WebAssembly.compile(wasmData as Buffer<ArrayBuffer>);
    await initialize(module);
}
