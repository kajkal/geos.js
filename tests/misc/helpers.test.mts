import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { geometryCollection, lineString, multiLineString, multiPoint, multiPolygon, point, polygon } from '../../src/misc/helpers.mjs';
import { toWKT } from '../../src/io/wkt.mjs';


describe('miscellaneous helpers', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should create simple geometries', () => {
        let g = point([ 1, 1 ]);
        assert.equal(toWKT(g), 'POINT (1 1)');

        g = lineString([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ]);
        assert.equal(toWKT(g), 'LINESTRING (0 0, 1 1, 2 2)');

        g = polygon([ [ [ 0, 0 ], [ 0, 2 ], [ 2, 2 ], [ 2, 0 ], [ 0, 0 ] ] ]);
        assert.equal(toWKT(g), 'POLYGON ((0 0, 0 2, 2 2, 2 0, 0 0))');

        g = multiPoint([ [ 1, 1 ], [ 2, 2 ], [ 3, 3 ] ]);
        assert.equal(toWKT(g), 'MULTIPOINT ((1 1), (2 2), (3 3))');

        g = multiLineString([ [ [ 0, 0 ], [ 1, 1 ] ], [ [ 2, 2 ], [ 3, 3 ] ] ]);
        assert.equal(toWKT(g), 'MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');

        g = multiPolygon([ [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ], [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 3, 2 ], [ 2, 2 ] ] ] ]);
        assert.equal(toWKT(g), 'MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)), ((2 2, 2 3, 3 3, 3 2, 2 2)))');
    });

    it('should create geometry collection from array of geos geometries', () => {
        const g1 = point([ 1, 1 ]);
        const g2 = lineString([ [ 0, 0 ], [ 2, 2 ] ]);
        const g3 = lineString([ [ 2, 8 ], [ 10, 8 ] ]);

        // not detached
        assert.ok(!g1.detached);
        assert.ok(!g2.detached);
        assert.ok(!g3.detached);

        const collection = geometryCollection([ g1, g2, g3 ]);
        assert.equal(toWKT(collection), 'GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 2 2), LINESTRING (2 8, 10 8))');

        // detached
        assert.ok(g1.detached);
        assert.ok(g2.detached);
        assert.ok(g3.detached);

        // should create empty geometry collection
        const emptyCollection = geometryCollection([]);
        assert.ok(emptyCollection.isEmpty());
        assert.equal(toWKT(emptyCollection), 'GEOMETRYCOLLECTION EMPTY');
    });

});
