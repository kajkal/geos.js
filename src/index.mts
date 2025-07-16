import { instantiate } from './core/geos.mjs';


/**
 * The most convenient way to initialize `geos.js` module.
 *
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
export { type Geometry, type GeometryRef, type GeometryType } from './geom/Geometry.mjs';
export { type Prepared, prepare, unprepare } from './geom/PreparedGeometry.mjs';
export { type Point } from './geom/types/Point.mjs';
export { type LineString } from './geom/types/LineString.mjs';
export { type LinearRing } from './geom/types/LinearRing.mjs';
export { type Polygon } from './geom/types/Polygon.mjs';
export { type MultiPoint } from './geom/types/MultiPoint.mjs';
export { type MultiLineString } from './geom/types/MultiLineString.mjs';
export { type MultiPolygon } from './geom/types/MultiPolygon.mjs';
export { type GeometryCollection } from './geom/types/GeometryCollection.mjs';
export { type CircularString } from './geom/types/CircularString.mjs';
export { type CompoundCurve } from './geom/types/CompoundCurve.mjs';
export { type CurvePolygon } from './geom/types/CurvePolygon.mjs';
export { type MultiCurve } from './geom/types/MultiCurve.mjs';
export { type MultiSurface } from './geom/types/MultiSurface.mjs';
export {
    type GeometryOptions,
    point,
    lineString,
    polygon,
    multiPoint,
    multiLineString,
    multiPolygon,
    geometryCollection,
    box,
} from './helpers/helpers.mjs';

export { InvalidGeoJSONError } from './io/geosify.mjs';
export { fromGeoJSON, toGeoJSON } from './io/GeoJSON.mjs';
export { fromWKT, type WKTInputOptions, toWKT, type WKTOutputOptions } from './io/WKT.mjs';
export { fromWKB, type WKBInputOptions, toWKB, type WKBOutputOptions } from './io/WKB.mjs';

export { type DensifyOptions } from './measurement/types/DensifyOptions.mjs';
export { bounds } from './measurement/bounds.mjs';
export { area } from './measurement/area.mjs';
export { length } from './measurement/length.mjs';
export { distance } from './measurement/distance.mjs';
export { hausdorffDistance } from './measurement/hausdorffDistance.mjs';
export { frechetDistance } from './measurement/frechetDistance.mjs';
export { nearestPoints } from './measurement/nearestPoints.mjs';

export { type PrecisionGridOptions } from './operations/types/PrecisionGridOptions.mjs';
export { buffer, type BufferOptions } from './operations/buffer.mjs';
export { difference } from './operations/difference.mjs';
export { intersection } from './operations/intersection.mjs';
export { symmetricDifference } from './operations/symmetricDifference.mjs';
export { unaryUnion } from './operations/unaryUnion.mjs';
export { union } from './operations/union.mjs';
export { makeValid, type MakeValidOptions } from './operations/makeValid.mjs';

export { isGeometry } from './predicates/isGeometry.mjs';
export { isPrepared } from './predicates/isPrepared.mjs';
export { isEmpty } from './predicates/isEmpty.mjs';
export { isSimple } from './predicates/isSimple.mjs';
export { isValid, isValidOrThrow, TopologyValidationError, type IsValidOptions } from './predicates/isValid.mjs';
export { equalsExact } from './predicates/equalsExact.mjs';
export { equalsIdentical } from './predicates/equalsIdentical.mjs';
export { distanceWithin } from './predicates/distanceWithin.mjs';

export { equals } from './spatial-predicates/equals.mjs';
export { intersects, disjoint } from './spatial-predicates/intersects.mjs';
export { contains, containsProperly, within } from './spatial-predicates/contains.mjs';
export { covers, coveredBy } from './spatial-predicates/covers.mjs';
export { crosses } from './spatial-predicates/crosses.mjs';
export { overlaps } from './spatial-predicates/overlaps.mjs';
export { touches } from './spatial-predicates/touches.mjs';
export { relate, relatePattern } from './spatial-predicates/relate.mjs';

export { type STRTreeRef, type STRTreeOptions, strTreeIndex } from './spatial-indexes/STRTree.mjs';

export { growMemory } from './other/growMemory.mjs';
export { version } from './other/version.mjs';
