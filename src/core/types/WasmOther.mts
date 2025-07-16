import type { ConstPtr, GEOSGeometry, Ptr, u32 } from './WasmGEOS.mjs';


export type STRtree = 'STRtree';


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
     * @see {@link import('../../io/geosify.mjs')}
     */
    geosify_geomsCoords(buff: Ptr<void>): void;

    /**
     * Creates instances of `GEOSGeometry`.
     * @see {@link import('../../io/geosify.mjs')}
     */
    geosify_geoms(buff: Ptr<void>): void;

    /**
     * Writes geometries data into buffer.
     * @see {@link import('../../io/jsonify.mjs')}
     */
    jsonify_geoms(buff: Ptr<void>): void;


    STRtree_create(geoms: Ptr<GEOSGeometry[]>, ngeoms: u32, nodeCapacity: u32): Ptr<STRtree>;

    STRtree_destroy(tree: Ptr<STRtree>): void;

    STRtree_query(tree: Ptr<STRtree>, g: ConstPtr<GEOSGeometry>, matchesLength: Ptr<u32>): Ptr<u32> | 0;

    STRtree_nearest(tree: Ptr<STRtree>, g: ConstPtr<GEOSGeometry>, matchesLength: Ptr<u32>): u32;

    STRtree_nearestAll(tree: Ptr<STRtree>, g: ConstPtr<GEOSGeometry>, matchesLength: Ptr<u32>): Ptr<u32> | 0;

}
