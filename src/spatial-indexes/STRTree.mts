import type { GEOSGeometry, Ptr, u32 } from '../core/types/WasmGEOS.mjs';
import type { STRtree } from '../core/types/WasmOther.mjs';
import type { OutPtr } from '../core/reusable-memory.mjs';
import type { Geometry } from '../geom/Geometry.mjs';
import { CLEANUP, FINALIZATION, POINTER } from '../core/symbols.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { geos } from '../core/geos.mjs';


export interface STRTreeOptions {

    /**
     * The maximum number of child nodes that a tree node may have.\
     * The minimum recommended capacity value is 4.
     * @default 10
     */
    nodeCapacity?: number;

}

/**
 * Constructs a 2D [R-tree](https://en.wikipedia.org/wiki/R-tree) spatial index
 * using Sort-Tile-Recursive (STR) packing algorithm.
 *
 * The index is query-only; once constructed, geometries cannot be added or
 * removed from the index.
 *
 * The tree indexes the [bounding boxes]{@link bounds} of each geometry.
 * Geometries of any type can be indexed, types can mix within one index.
 * Empty geometries are ignored during indexing and will never be returned by
 * queries.
 *
 * @template G - The type of indexed geometry
 * @param geometries - The array of geometries to be indexed
 * @param options - Optional options object
 * @returns A new {@link STRTreeRef} instance
 * @throws {GEOSError} when `options.nodeCapacity` is less than 2
 *
 * @example #live
 * const geometriesToIndex = [
 *     point([ 0, 0 ]), point([ 0, 2 ]), point([ 0, 4 ]),
 *     point([ 2, 0 ]), point([ 2, 2 ]), point([ 2, 4 ]),
 *     point([ 4, 0 ]), point([ 4, 2 ]), point([ 4, 4 ]),
 *     point([ 6, 0 ]), lineString([ [ 6, 2 ], [ 6, 4 ] ]),
 * ];
 * const tree = strTreeIndex(geometriesToIndex);
 *
 * // index can now be queried by geometry bbox:
 * const g1 = box([ 3, 1, 7, 3 ]); // <POLYGON ((3 1, 3 3, 7 3, 7 1, 3 1))>
 * // note that not the geometry but just its bbox will be used by the query
 * // any geometry type could be used to query index, including points and lines
 * const queryMatches = tree.query(g1);
 * // [ <POINT (4 2)>, <LINESTRING (6 2, 6 4)> ]
 *
 * // or used to find the nearest tree geometry:
 * const g2 = point([ 1.5, 1.75 ]);
 * // `nearest` uses Cartesian distance not between bboxes but actual geometries
 * const nearestMatch = tree.nearest(g2);
 * // <POINT (2 2)>
 */
export function strTreeIndex<G extends Geometry>(geometries: G[], options?: STRTreeOptions): STRTreeRef<G> {
    const nodeCapacity = options?.nodeCapacity ?? 10;
    if (nodeCapacity < 2) {
        throw new GEOSError('Node capacity must be greater than 1');
    }

    const ngeoms = geometries.length;
    const geoms = geos.malloc<GEOSGeometry[]>(ngeoms * 4);
    try {
        let B = geos.U32, b = geoms >>> 2;
        for (const geometry of geometries) {
            B[ b++ ] = geometry[ POINTER ];
        }
        const treePtr = geos.STRtree_create(geoms, ngeoms, nodeCapacity);
        return new STRTreeRef(treePtr, geometries);
    } catch (e) {
        geos.free(geoms);
        throw e;
    }
}


/**
 * Class representing a (STR) [R-tree](https://en.wikipedia.org/wiki/R-tree)
 * that exists in the Wasm memory.
 *
 * STRTree is a query-only R-tree spatial index structure for two-dimensional
 * data that uses Sort-Tile-Recursive packing algorithm.
 *
 * To create new index use {@link strTreeIndex} function.
 *
 * @template G - The type of indexed geometry
 */
export class STRTreeRef<G extends Geometry = Geometry> {

    /**
     * The original geometries that were indexed by the tree.
     * This array is readonly and should not be modified.
     */
    readonly geometries: G[];

    /**
     * Object becomes detached when manually [freed]{@link STRTreeRef#free}.
     * Detached objects are no longer valid and should not be used.
     */
    detached?: boolean;

    /**
     * Returns all geometries whose [bounding box]{@link bounds} intersects
     * with the query geometry's bounding box.
     *
     * @param geometry - The geometry whose bounding box will be used in the
     * query
     * @returns An array of geometries whose bounding box intersects with the
     * query geometry's bounding box.
     *
     * @see {@link box} creates Polygon geometry that can be used by the query
     * when starting from bounds array
     *
     * @example #live
     * const geometries = [
     *     point([ 0, 2 ]), lineString([ [ 4, 2 ], [ 8, 2 ] ]),
     *     point([ 0, 4 ]), point([ 4, 4 ]), point([ 8, 4 ]),
     * ];
     * const selector = box([ 2, 0, 6, 6 ]);
     * // <POLYGON ((2 0, 2 6, 6 6, 6 0, 2 0))>
     *
     * const tree = strTreeIndex(geometries);
     * const queryMatches = tree.query(selector);
     * // [ <LINESTRING (4 2, 8 2)>, <POINT (4 4)> ]
     *
     * // the results can be freely processed further
     * // for example, to get geometries that are fully inside `selector`:
     * const inside = queryMatches.filter(g => covers(selector, g));
     * // [ <POINT (4 4)> ]
     */
    query(geometry: Geometry): G[] {
        const l = geos.u1 as OutPtr<u32>;
        const matchesPtr = geos.STRtree_query(this[ POINTER ], geometry[ POINTER ], l[ POINTER ]);
        return selectMatches(this.geometries, matchesPtr, l);
    }

    /**
     * Returns the geometry with the minimum distance to the query geometry.
     *
     * Cartesian distance is calculated between the actual geometries, not
     * their bounding boxes.
     *
     * If there are multiple equidistant geometries, this function will return
     * only one of them. To return all such geometries, use {@link nearestAll}.
     *
     * @param geometry - Geometry for which the nearest neighbor is queried
     * @returns The nearest geometry or `undefined` if the tree is empty
     * @throws {GEOSError} if any of the considered candidates for the nearest
     * geometry is one of unsupported geometry types (curved)
     *
     * @example #live
     * const geometries = [
     *     point([ 0, 2 ]), lineString([ [ 4, 2 ], [ 8, 2 ] ]),
     *     point([ 0, 4 ]), point([ 4, 4 ]), point([ 8, 4 ]),
     * ];
     * const target = lineString([ [ 1, 0 ], [ 1, 5 ], [ 3, 6 ] ]);
     *
     * const tree = strTreeIndex(geometries);
     * const nearestMatch = tree.nearest(target);
     * // <POINT (0 2)>
     * const nearestAllMatches = tree.nearestAll(target);
     * // [ <POINT (0 2)>, <POINT (0 4)> ]
     */
    nearest(geometry: Geometry): G | undefined {
        const l = geos.u1 as OutPtr<u32>;
        const nearestIdx = geos.STRtree_nearest(this[ POINTER ], geometry[ POINTER ], l[ POINTER ]);
        if (l.get()) {
            return this.geometries[ nearestIdx ];
        }
    }

    /**
     * Returns all geometries with the minimum distance to the query geometry.
     *
     * Cartesian distance is calculated between the actual geometries, not
     * their bounding boxes.
     *
     * @param geometry - Geometry for which the nearest neighbors are queried
     * @returns An array of all nearest geometries with the same minimum
     * distance to the query geometry, or an empty array if the tree is empty
     * @throws {GEOSError} if any of the considered candidates for the nearest
     * geometry is one of unsupported geometry types (curved)
     *
     * @example #live
     * const geometries = [
     *     point([ 0, 5 ]), lineString([ [ 3, 4 ], [ 5, 5 ], [ 4, 3 ] ]),
     *     point([ 5, 0 ]), lineString([ [ 4, -3 ], [ 5, -5 ], [ 3, -4 ] ]),
     *     point([ 0, -5 ]), lineString([ [ -3, -4 ], [ -5, -5 ], [ -4, -3 ] ]),
     *     point([ -5, 0 ]), lineString([ [ -3, 4 ], [ -5, 5 ], [ -4, 3 ] ]),
     * ];
     * const tree = strTreeIndex(geometries);
     *
     * const g1 = point([ 0, 0 ]);
     * const matches1 = tree.nearestAll(g1);
     * // all geometries as they are all 5 units away from the `g1`
     *
     * const g2 = point([ 4.5, 1.5 ]);
     * const matches2 = tree.nearestAll(g2);
     * // [ <POINT (5 0)>, <LINESTRING (3 4, 5 5, 4 3)> ]
     *
     * const g3 = point([ 3, 3 ]);
     * const matches3 = tree.nearestAll(g3);
     * // [ <LINESTRING (3 4, 5 5, 4 3)> ]
     */
    nearestAll(geometry: Geometry): G[] {
        const l = geos.u1 as OutPtr<u32>;
        const matchesPtr = geos.STRtree_nearestAll(this[ POINTER ], geometry[ POINTER ], l[ POINTER ]);
        return selectMatches(this.geometries, matchesPtr, l);
    }

    /**
     * Frees the Wasm memory allocated for the STRTree object.
     *
     * This method exists as a backup for those who find [`FinalizationRegistry`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry}
     * unreliable and want a way to free the memory manually.
     *
     * Manually freed object is marked as [detached]{@link STRTreeRef#detached}.
     */
    free(): void {
        STRTreeRef[ FINALIZATION ].unregister(this);
        STRTreeRef[ CLEANUP ](this[ POINTER ]);
        this.detached = true;
    }

    /** @internal */
    [ POINTER ]: Ptr<STRtree>;

    /** @internal */
    constructor(ptr: Ptr<STRtree>, geometries: G[]) {
        STRTreeRef[ FINALIZATION ].register(this, ptr, this);
        this[ POINTER ] = ptr;
        this.geometries = geometries;
    }

    /** @internal */
    static readonly [ FINALIZATION ] = (
        new FinalizationRegistry(STRTreeRef[ CLEANUP ])
    );

    /** @internal */
    static [ CLEANUP ](ptr: Ptr<STRtree>): void {
        geos.STRtree_destroy(ptr);
    }

}


function selectMatches<G extends Geometry>(geometries: G[], matchesPtr: Ptr<u32> | 0, l: OutPtr<u32>): G[] {
    if (matchesPtr) {
        const matchesLength = l.get();
        const matches = Array<G>(matchesLength);
        let B = geos.U32, b = matchesPtr >>> 2;
        for (let i = 0; i < matchesLength; i++) {
            matches[ i ] = geometries[ B[ b++ ] ];
        }
        geos.free(matchesPtr);
        return matches;
    }
    return [];
}
