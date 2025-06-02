import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';


const wasmFilePath = join(import.meta.dirname, './cpp/build/js/geos_js.wasm');
const wasmData = readFileSync(wasmFilePath);

export default [
    {
        input: 'src/index.mts',
        output: { file: 'dist/esm/index.mjs', format: 'esm' },
        plugins: [
            replace({
                delimiters: [ '', '' ],
                '@example #live': '@example',
            }),
            typescript({ compilerOptions: { declaration: false } }),
            replace({
                'ROLLUP_WILL_INSERT_WASM_BASE64_HERE': wasmData.toString('base64'),
            }),
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
        output: { file: 'dist/umd/index.min.js', format: 'umd', name: 'geos' },
        plugins: [
            typescript({ compilerOptions: { declaration: false } }),
            replace({
                'ROLLUP_WILL_INSERT_WASM_BASE64_HERE': wasmData.toString('base64'),
            }),
            terser({
                keep_classnames: /^(Geometry|.+Error)$/,
                compress: {
                    passes: 2,
                },
            }),
        ],
    },
    {
        input: 'src/index.mts',
        output: { file: 'dist/esm/index.d.mts', format: 'esm' },
        plugins: [
            replace({
                delimiters: [ '', '' ],
                '@example #live': '@example',
            }),
            dts(),
        ],
    },
];
