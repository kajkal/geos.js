/**
 * 'geos.js' slim entrypoint
 *
 * In the docs 'geos.js' module could be initialized directly from the .wasm file
 * served by webpack as an asset resource, and as a result, 'initializeFromBase64'
 * could be omitted from the bundle, saving some bytes.
 *
 * By wrapping 'geos.js' module here, we could import all its functions without naming
 * them all (`import { a, lot, of, imports... } from 'geos.js';`) but omitting
 * 'initializeFromBase64'.
 */

export * from 'geos.js';
export const initializeFromBase64 = () => {
    throw new Error(`'initializeFromBase64' is not available in this mode.`);
};
