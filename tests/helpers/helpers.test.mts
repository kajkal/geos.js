import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry, GeometryRef } from '../../src/geom/Geometry.mjs';
import { geometryCollection, lineString, multiLineString, multiPoint, multiPolygon, point, polygon } from '../../src/helpers/helpers.mjs';
import { isEmpty } from '../../src/predicates/isEmpty.mjs';
import { toWKT } from '../../src/io/WKT.mjs';


describe('miscellaneous helpers', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should create simple geometries', () => {
        let g: Geometry = point([ 1, 1 ]);
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
        assert.ok(isEmpty(emptyCollection));
        assert.equal(toWKT(emptyCollection), 'GEOMETRYCOLLECTION EMPTY');
    });

    it('should assign id to new geometry', () => {
        const options = { id: 0 };
        let g: GeometryRef = point([], options);
        assert.equal(g.id, 0);

        g = lineString([], options);
        assert.equal(g.id, 0);

        g = polygon([], options);
        assert.equal(g.id, 0);

        g = multiPoint([], options);
        assert.equal(g.id, 0);

        g = multiLineString([], options);
        assert.equal(g.id, 0);

        g = multiPolygon([], options);
        assert.equal(g.id, 0);

        g = geometryCollection([], options);
        assert.equal(g.id, 0);
    });

    it('should assign props to new geometry', () => {
        const options = { properties: { some: 'prop' } };
        let g: GeometryRef = point([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = lineString([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = polygon([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiPoint([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiLineString([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiPolygon([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = geometryCollection([], options);
        assert.deepEqual(g.props, { some: 'prop' });
    });

});
