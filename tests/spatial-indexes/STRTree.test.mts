import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { type Geometry } from '../../src/geom/Geometry.mjs';
import { strTreeIndex, STRTreeRef } from '../../src/spatial-indexes/STRTree.mjs';
import { box, lineString, point, polygon } from '../../src/helpers/helpers.mjs';
import { intersects } from '../../src/spatial-predicates/intersects.mjs';
import { buffer } from '../../src/operations/buffer.mjs';
import { distance } from '../../src/measurement/distance.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';
import { POINTER } from '../../src/core/symbols.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('(STR) R-tree', () => {

    before(async () => {
        await initializeForTest();
    });

    describe('destruct', () => {

        it('should destroy instance when free() method is called', () => {
            const destroy = mock.method(geos, 'STRtree_destroy');

            const tree = strTreeIndex([]);
            assert.ok(tree instanceof STRTreeRef);
            assert.ok(!tree.detached);
            assert.equal(destroy.mock.callCount(), 0);
            tree.free();
            assert.ok(tree.detached);
            assert.equal(destroy.mock.callCount(), 1);
            assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ tree[ POINTER ] ]);
        });

        it('should automatically destroy instance when out of scope', async () => {
            const destroy = mock.method(geos, 'STRtree_destroy');

            let ptr;
            assert.equal(destroy.mock.callCount(), 0);
            void function () {
                const tree = strTreeIndex([]);
                assert.ok(tree instanceof STRTreeRef);
                ptr = tree[ POINTER ];
            }();
            { // to trigger FinalizationRegistry
                global.gc!();
                await new Promise(resolve => setTimeout(resolve));
            }
            assert.equal(destroy.mock.callCount(), 1);
            assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ ptr ]);
        });

    });

    describe('construct', () => {

        it('should create new STRTreeRef instance', () => {
            const geometries1: Geometry[] = [];
            const tree1 = strTreeIndex(geometries1);
            assert.equal(tree1.geometries, geometries1);

            const geometries2: Geometry[] = [
                point([ 1, 1 ]),
                lineString([ [ 0, 0 ], [ 1, 0 ] ]),
                fromWKT('GEOMETRYCOLLECTION EMPTY'), // empty geometry
                fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)'), // curved geometry
            ];
            const tree2 = strTreeIndex(geometries2);
            assert.equal(tree2.geometries, geometries2);
        });

        it('should throw on invalid nodeCapacity value', () => {
            const expectedError = {
                name: 'GEOSError',
                message: 'Node capacity must be greater than 1',
            };
            assert.doesNotThrow(() => strTreeIndex([], { nodeCapacity: 2 }));
            assert.throws(() => strTreeIndex([], { nodeCapacity: 1 }), expectedError);
            assert.throws(() => strTreeIndex([], { nodeCapacity: 0 }), expectedError);
            assert.throws(() => strTreeIndex([], { nodeCapacity: -1 }), expectedError);
        });

    });

    describe('query', () => {

        it('should return empty array when the tree is empty', () => {
            let tree: STRTreeRef, matches: Geometry[];

            tree = strTreeIndex([]);
            matches = tree.query(polygon([ [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ], [ 1, 1 ] ] ]));
            assert.deepEqual(matches, []);

            tree = strTreeIndex([ polygon([]), point([]) ]);
            matches = tree.query(point([ 0, 0 ]));
            assert.deepEqual(matches, []);
        });

        it('should return empty array when no matches found', () => {
            const tree = strTreeIndex([
                point([ 0, 0 ]), lineString([ [ 4, 0 ], [ 8, 1 ] ]),
                point([ 0, 4 ]), lineString([ [ 4, 4 ], [ 8, 5 ] ]),
            ]);
            const matches = tree.query(polygon([ [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ], [ 1, 1 ] ] ]));
            assert.deepEqual(matches, []);
        });

        it('should return geometries whose bbox intersects input geometry bbox', () => {
            const geometries = [
                [ 24, 154 ], [ 238, 42 ], [ 161, 140 ], [ 146, 127 ], [ 3, 80 ], [ 29, 32 ],
                [ 259, 122 ], [ 6, 31 ], [ 186, 29 ], [ 139, 68 ], [ 260, 188 ], [ 75, 100 ],
                [ 202, 32 ], [ 231, 179 ], [ 120, 150 ], [ 38, 164 ], [ 112, 28 ], [ 292, 199 ],
                [ 72, 58 ], [ 153, 98 ], [ 119, 65 ], [ 27, 130 ], [ 65, 55 ], [ 171, 60 ],
                [ 80, 176 ], [ 266, 53 ], [ 94, 106 ], [ 65, 58 ], [ 44, 185 ], [ 46, 127 ],
            ].map((pt, i) => buffer(point(pt), i % 12, { quadrantSegments: 2 }));

            const tree = strTreeIndex(geometries, { nodeCapacity: 4 });
            const queryGeometry = box([ 150, 100, 250, 200 ]);
            const matches = tree.query(queryGeometry)
                .sort((a, b) => geometries.indexOf(a) - geometries.indexOf(b));
            const matchesBruteForce = geometries.filter(g => intersects(queryGeometry, g));

            assert.deepEqual(matches, matchesBruteForce);
            assert.deepEqual(matches, [
                tree.geometries[ 2 ],
                tree.geometries[ 10 ],
                tree.geometries[ 13 ],
                tree.geometries[ 19 ],
            ]);
        });

        it('should not throw if tree contains curved geometries', () => {
            const tree = strTreeIndex([
                fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)'),
                fromWKT('CIRCULARSTRING (0 10, 10 12, 2 10)'),
                fromWKT('CIRCULARSTRING (0 20, 20 23, 2 20)'),
            ]);
            const matches = tree.query(polygon([ [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ], [ 1, 1 ] ] ]));
            assert.deepEqual(matches, [ tree.geometries[ 0 ] ]);
        });

    });

    describe('nearest', () => {

        it('should return undefined when the tree is empty', () => {
            let tree: STRTreeRef, nearest: Geometry | undefined, nearestAll: Geometry[];

            tree = strTreeIndex([]);
            nearest = tree.nearest(point([ 0, 0 ]));
            nearestAll = tree.nearestAll(point([ 0, 0 ]));
            assert.equal(nearest, undefined);
            assert.deepEqual(nearestAll, []);

            tree = strTreeIndex([ polygon([]), point([]) ]);
            nearest = tree.nearest(point([ 0, 0 ]));
            nearestAll = tree.nearestAll(point([ 0, 0 ]));
            assert.equal(nearest, undefined);
            assert.deepEqual(nearestAll, []);
        });

        it('should return nearest geometry', () => {
            const geometries = Array
                .from({ length: 1_000 }, _ => point([
                    Math.floor(Math.random() * 10_000),
                    Math.floor(Math.random() * 10_000),
                ]));

            const tree = strTreeIndex(geometries, { nodeCapacity: 8 });
            const queryGeometry = point([
                Math.floor(Math.random() * 10_000),
                Math.floor(Math.random() * 10_000),
            ]);

            const nearest = tree.nearest(queryGeometry);
            const nearestBruteForce = geometries.reduce((acc, g) => {
                const dist = distance(queryGeometry, g);
                return (dist < acc.min) ? { min: dist, g } : acc;
            }, { min: Infinity, g: point([]) });

            assert.equal(nearest, nearestBruteForce.g);

            const nearestAll = tree.nearestAll(queryGeometry);
            assert.deepEqual(nearestAll, [ nearest ]);
        });

        it('should return nearest geometry when its index is 0', () => {
            // Wasm side returns geometry indices, index 0 could be mistaken with nullptr
            const tree = strTreeIndex([
                point([ 2, 2 ]), point([ 2, 4 ]),
                point([ 4, 2 ]), point([ 4, 4 ]),
            ]);
            const nearest = tree.nearest(point([ 1, 1 ]));
            assert.equal(nearest, tree.geometries[ 0 ]);
        });

        it('should return all equidistant nearest geometries', () => {
            const geometries = [
                point([ 0, 5 ]), point([ 3, 4 ]), point([ 4, 3 ]),
                point([ 5, 0 ]), point([ 4, -3 ]), point([ 3, -4 ]),
                point([ 0, -5 ]), point([ -3, -4 ]), point([ -4, -3 ]),
                point([ -5, 0 ]), point([ -3, 4 ]), point([ -4, 3 ]),
            ];
            const tree = strTreeIndex(geometries, { nodeCapacity: 2 });
            const queryGeometry = point([ 0, 0 ]);
            const nearestAll = tree.nearestAll(queryGeometry)
                .sort((a, b) => geometries.indexOf(a) - geometries.indexOf(b));

            assert.equal(nearestAll.length, geometries.length);
            assert.deepEqual(nearestAll, geometries);
            assert.equal(tree.nearest(queryGeometry), geometries[ 6 ]);
        });

        it('should throw if tree contains curved geometries', () => {
            const tree = strTreeIndex([
                fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)'),
                fromWKT('CIRCULARSTRING (0 10, 10 12, 2 10)'),
                fromWKT('CIRCULARSTRING (0 20, 20 23, 2 20)'),
            ]);
            assert.throws(() => tree.nearest(point([ 0, 0 ])), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
            assert.throws(() => tree.nearestAll(point([ 0, 0 ])), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

});
