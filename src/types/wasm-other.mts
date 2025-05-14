import type { Ptr, u32 } from './wasm-geos.mjs';


export interface WasmOther {

    // standalone-wasm specific
    // initializes module stuff, calls `__wasm_call_ctors`
    _initialize(): void;

    // throws RuntimeError: unreachable
    __trap(): never;


    malloc<T>(size: u32): Ptr<T>;

    free<T>(ptr: Ptr<T>): void;


    /**
     * Creates blank instances of `GEOSCoordSequence`
     * for (Multi)LineStrings and (Multi)Polygons.
     * @see {@link import('../io/geosify.mjs')}
     */
    geosify_geomsCoords(buff: Ptr<void>): void;

    /**
     * Creates instances of `GEOSGeometry`.
     * @see {@link import('../io/geosify.mjs')}
     */
    geosify_geoms(buff: Ptr<void>): void;

    /**
     * Writes geometries data into buffer.
     * @see {@link import('../io/jsonify.mjs')}
     */
    jsonify_geoms(buff: Ptr<void>): void;

}
