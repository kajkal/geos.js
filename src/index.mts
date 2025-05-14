import { instantiate } from './core/geos.mjs';


/**
 * The most convenient way to initialize `geos.js` module.
 * The .wasm file is embedded directly into the .js file as a base64 string.
 * Although convenient, this causes a certain penalty during initial initialization
 * due to base64 to binary conversion and ~33% overhead of .wasm file size.
 *
 * @returns A Promise that resolves with the WebAssembly module
 *
 * @example in any environment
 * await initializeFromBase64();
 *
 * @see {@link terminate}
 */
export async function initializeFromBase64(): Promise<WebAssembly.Module> {
    const str = atob('ROLLUP_WILL_INSERT_WASM_BASE64_HERE'), l = str.length;
    const u8 = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
        u8[ i ] = str.charCodeAt(i);
    }
    const module = await WebAssembly.compile(u8);
    return await instantiate(module);
}

/**
 * Initializes `geos.js` module using `fetch` request or already compiled module.
 *
 * @returns A Promise that resolves with the WebAssembly module
 *
 * @example browser; directly from fetch request
 * await initialize(fetch('geos_js.wasm'));
 *
 * @example browser; from compiled module
 * const module = await WebAssembly.compileStreaming(fetch('geos_js.wasm'));
 * await initialize(module);
 *
 * @example node; from a local file
 * const wasmData = await readFile('./geos_js.wasm');
 * const module = await WebAssembly.compile(wasmData);
 * await initialize(module);
 *
 * @see {@link terminate}
 */
export async function initialize(source: Response | PromiseLike<Response> | WebAssembly.Module): Promise<WebAssembly.Module> {
    return await instantiate(source);
}


export { terminate } from './core/geos.mjs';
export { GeosError } from './core/geos-error.mjs';
export { version } from './misc/version.mjs';
export { growMemory } from './misc/grow-memory.mjs';
export { type Geometry } from './geom/geometry.mjs';
export { point, lineString, polygon, multiPoint, multiLineString, multiPolygon, geometryCollection } from './misc/helpers.mjs';
export { geosifyGeometry, geosifyGeometries, InvalidGeoJSONError } from './io/geosify.mjs';
export { jsonifyGeometry, jsonifyGeometries } from './io/jsonify.mjs';
export { fromWKT, type WKTInputOptions, toWKT, type WKTOutputOptions } from './io/wkt.mjs';
export { fromWKB, type WKBInputOptions, toWKB, type WKBOutputOptions } from './io/wkb.mjs';
export { buffer } from './operation/buffer.mjs';
export { difference } from './operation/difference.mjs';
export { intersection } from './operation/intersection.mjs';
export { symmetricDifference } from './operation/symmetric-difference.mjs';
export { unaryUnion } from './operation/unary-union.mjs';
export { union } from './operation/union.mjs';
