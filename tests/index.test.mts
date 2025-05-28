import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it, mock } from 'node:test';
import { MockAgent, setGlobalDispatcher } from 'undici';
import { GEOS_JS_WASM_PATH } from './tests-utils.mjs';
import { initialize, initializeFromBase64 } from '../src/index.mjs';
import { geos, terminate } from '../src/core/geos.mjs';


describe('index', () => {

    let wasmData: Buffer;

    before(async () => {
        wasmData = await readFile(GEOS_JS_WASM_PATH);
    });

    it('should throw when geos is not initialized', () => {
        assert.throws(() => geos.malloc(8), {
            name: 'GEOSError',
            message: 'GEOS.js not initialized',
        });
        // but should not throw when `GEOS_destroy` fn is called
        assert.equal(geos.GEOSGeom_destroy(123 as any), 0);
    });

    it('should initialize from base64', async () => {
        // replace base64 placeholder with the actual wasm base64
        const wasmBase64 = wasmData.toString('base64');
        const originalAtob = atob;
        mock.method(global, 'atob', () => originalAtob(wasmBase64));

        const result = await initializeFromBase64();
        assert.ok(result instanceof WebAssembly.Module);

        assert.equal('GEOSversion' in geos, true); // some wasm exported function
        await terminate();
        assert.equal('GEOSversion' in geos, false);
    });

    it('should initialize from fetch request', async () => {
        // mock fetch
        const agent = new MockAgent();
        setGlobalDispatcher(agent);
        agent
            .get('https://some-path.com')
            .intercept({
                path: 'geos_js.wasm',
                method: 'GET',
            })
            .reply(200, wasmData, {
                headers: {
                    'Content-Type': 'application/wasm',
                },
            });

        const result = await initialize(fetch('https://some-path.com/geos_js.wasm'));
        assert.ok(result instanceof WebAssembly.Module);

        assert.equal('GEOSversion' in geos, true);
        await terminate();
        assert.equal('GEOSversion' in geos, false);
    });

    it('should initialize from compiled module', async () => {
        const module = await WebAssembly.compile(wasmData);

        const result = await initialize(module);
        assert.ok(result instanceof WebAssembly.Module);
        assert.equal(result, module); // the same instance

        assert.equal('GEOSversion' in geos, true);
        await terminate();
        assert.equal('GEOSversion' in geos, false);
    });

});
