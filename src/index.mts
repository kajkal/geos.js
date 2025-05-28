import { instantiate } from './core/geos.mjs';


/**
 * The most convenient way to initialize `geos.js` module.
 * The .wasm file is embedded directly into the .js file as a base64 string.
 * Although convenient, this causes a certain penalty during initial initialization
 * due to base64 to binary conversion and ~33% overhead of .wasm file size.
 *
 * Note that the returned module is just stateless, compiled WebAssembly code.
 * `WebAssembly.Module` could be shared with another worker or window via `postMessage`.
 *
 * @returns A Promise that resolves with the `WebAssembly.Module`
 *
 * @see {@link initialize} initializes `geos.js` module from a fetch request
 * or already compiled module
 * @see {@link terminate} terminates initialized `geos.js` instance
 *
 * @example in any environment
 * await initializeFromBase64();
 */
async function initializeFromBase64(): Promise<WebAssembly.Module> {
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
 * Note that the returned module is just stateless, compiled WebAssembly code.
 * `WebAssembly.Module` could be shared with another worker or window via `postMessage`.
 *
 * @param source - Either a .wasm file fetch or already compiled module
 * @returns A Promise that resolves with the `WebAssembly.Module`
 *
 * @see {@link terminate} terminates initialized `geos.js` instance
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
 */
async function initialize(source: Response | Promise<Response> | WebAssembly.Module): Promise<WebAssembly.Module> {
    return await instantiate(source);
}


export { initializeFromBase64, initialize };
export { terminate } from './core/geos.mjs';

export { GEOSError } from './core/GEOSError.mjs';
export { Geometry, type GeometryType } from './geom/Geometry.mjs';
export { point, lineString, polygon, multiPoint, multiLineString, multiPolygon, geometryCollection } from './helpers/helpers.mjs';

export { geosifyGeometry, geosifyGeometries, InvalidGeoJSONError } from './io/geosify.mjs';
export { jsonifyGeometry, jsonifyGeometries } from './io/jsonify.mjs';
export { fromWKT, type WKTInputOptions, toWKT, type WKTOutputOptions } from './io/wkt.mjs';
export { fromWKB, type WKBInputOptions, toWKB, type WKBOutputOptions } from './io/wkb.mjs';

export { length } from './measurement/length.mjs';
export { area } from './measurement/area.mjs';
export { bounds } from './measurement/bounds.mjs';

export { type PrecisionGridOptions } from './operations/types/PrecisionGridOptions.mjs';
export { buffer, type BufferOptions } from './operations/buffer.mjs';
export { difference } from './operations/difference.mjs';
export { intersection } from './operations/intersection.mjs';
export { symmetricDifference } from './operations/symmetricDifference.mjs';
export { unaryUnion } from './operations/unaryUnion.mjs';
export { union } from './operations/union.mjs';
export { makeValid, type MakeValidOptions } from './operations/makeValid.mjs';

export { isEmpty } from './predicates/isEmpty.mjs';
export { isSimple } from './predicates/isSimple.mjs';
export { isValid, isValidOrThrow, TopologyValidationError, type IsValidOptions } from './predicates/isValid.mjs';

export { growMemory } from './other/growMemory.mjs';
export { version } from './other/version.mjs';
