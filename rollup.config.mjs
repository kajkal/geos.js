import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';


const wasmFilePath = join(import.meta.dirname, './cpp/build/js/geos_js.wasm');
const wasmData = readFileSync(wasmFilePath);
const wasmDataBase64 = wasmData.toString('base64');

export default [

    /** ESM */
    {
        input: 'src/index.mts',
        output: { file: 'dist/esm/index.mjs', format: 'esm' },
        plugins: [
            typescript({ compilerOptions: { declaration: false } }),
            replace({
                'ROLLUP_WILL_INSERT_WASM_BASE64_HERE': wasmDataBase64,
            }),
            cleanupJSDocs(),
            {
                name: 'copy-wasm-file-to-dist',
                async buildStart() {
                    await mkdir(join(import.meta.dirname, './dist'), { recursive: true });
                    await writeFile(join(import.meta.dirname, './dist/geos_js.wasm'), wasmData);
                },
            },
        ],
    },
    {
        input: 'src/index.mts',
        output: { file: 'dist/esm/index.d.mts', format: 'esm' },
        plugins: [
            dts(),
            cleanupJSDocs(),
        ],
    },


    /** UMD */
    {
        input: 'src/index.mts',
        output: { file: 'dist/umd/index.min.js', format: 'umd', name: 'geos' },
        plugins: [
            typescript({ compilerOptions: { declaration: false } }),
            replace({
                'ROLLUP_WILL_INSERT_WASM_BASE64_HERE': wasmDataBase64,
            }),
            terser({ compress: { passes: 2 } }),
        ],
    },
    {
        input: 'src/index.mts',
        output: { file: 'dist/umd/index-slim.min.js', format: 'umd', name: 'geos' },
        plugins: [
            typescript({ compilerOptions: { declaration: false } }),
            replace({
                'export async function initializeFromBase64': 'async function initializeFromBase64',
            }),
            terser({ compress: { passes: 2 } }),
        ],
    },

];


function cleanupJSDocs() {
    return {
        name: 'cleanup-js-docs',
        generateBundle(_, bundle) {
            for (const fileName in bundle) {
                bundle[ fileName ].code = bundle[ fileName ].code
                    // cleanup JSDoc "@example #live" tags
                    .replace(/@example #live(?:\[.+?])?/g, '@example');
            }
        },
    };
}
