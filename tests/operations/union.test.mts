import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { union } from '../../src/operations/union.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';


describe('union', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return union of two points', () => {
        const a = fromWKT('POINT (2 8)');
        const b = fromWKT('POINT (3 9)');
        assert.equal(toWKT(union(a, b)), 'MULTIPOINT ((2 8), (3 9))');
        assert.equal(toWKT(union(b, a)), 'MULTIPOINT ((3 9), (2 8))');
    });

    it('should return union of two disjoint collections', () => {
        const a = fromWKT('GEOMETRYCOLLECTION(POINT(0 0), LINESTRING(1 1, 2 2))');
        const b = fromWKT('GEOMETRYCOLLECTION(POINT(10 10), LINESTRING(11 11, 12 12))');
        assert.equal(toWKT(union(a, b)), 'GEOMETRYCOLLECTION (POINT (0 0), POINT (10 10), LINESTRING (11 11, 12 12), LINESTRING (1 1, 2 2))');
        assert.equal(toWKT(union(b, a)), 'GEOMETRYCOLLECTION (POINT (0 0), POINT (10 10), LINESTRING (1 1, 2 2), LINESTRING (11 11, 12 12))');
    });

    it('should reduce geometries that are contained in polygon', () => {
        const a = fromWKT('GEOMETRYCOLLECTION(POINT(0 0), LINESTRING(1 1, 2 2))');
        const b = fromWKT('POLYGON((-10 -10, -10 10, 10 10, 10 -10, -10 -10))');
        assert.equal(toWKT(union(a, b)), 'POLYGON ((-10 10, 10 10, 10 -10, -10 -10, -10 10))');
        assert.equal(toWKT(union(b, a)), 'POLYGON ((-10 10, 10 10, 10 -10, -10 -10, -10 10))');
    });

    it('should return union of two collections', () => {
        const a = fromWKT('GEOMETRYCOLLECTION(POINT(0.5 0.5), LINESTRING(0 0, 2 2), POLYGON((0 0, 1 0, 1 1, 0 1, 0 0)))');
        const b = fromWKT('GEOMETRYCOLLECTION(LINESTRING(0.5 0.5, 0.5 4), POINT(2 0))');
        assert.equal(toWKT(union(a, b)), 'GEOMETRYCOLLECTION (POINT (2 0), LINESTRING (0.5 1, 0.5 4), LINESTRING (1 1, 2 2), POLYGON ((0 1, 1 1, 1 0, 0 0, 0 1)))');
        assert.equal(toWKT(union(b, a)), 'GEOMETRYCOLLECTION (POINT (2 0), LINESTRING (1 1, 2 2), LINESTRING (0.5 1, 0.5 4), POLYGON ((0 1, 1 1, 1 0, 0 0, 0 1)))');

        const c = fromWKT('GEOMETRYCOLLECTION(POLYGON((0 0, 10 0, 10 10, 0 10, 0 0)), POINT EMPTY, MULTIPOINT(4 4, 11 11), LINESTRING(5 5, 6 6))');
        const d = fromWKT('GEOMETRYCOLLECTION(POLYGON((2 2, 12 2, 12 12, 2 12, 2 2)), LINESTRING EMPTY, MULTIPOINT(4 4, 11 11), LINESTRING(5 6, 6 5))');
        assert.equal(toWKT(union(c, d)), 'POLYGON ((2 12, 12 12, 12 2, 10 2, 10 0, 0 0, 0 10, 2 10, 2 12))');
        assert.equal(toWKT(union(d, c)), 'POLYGON ((10 0, 0 0, 0 10, 2 10, 2 12, 12 12, 12 2, 10 2, 10 0))');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => union(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

    it('(prec) should return union of two points', () => {
        const a = fromWKT('POINT (1.9 8.2)');
        const b = fromWKT('POINT (4.1 9.8)');
        assert.equal(toWKT(union(a, b, { gridSize: 1 })), 'MULTIPOINT ((2 8), (4 10))');
        assert.equal(toWKT(union(b, a, { gridSize: 1 })), 'MULTIPOINT ((4 10), (2 8))');
    });

    it('(prec) should return union of two not completely adjacent polygons', () => {
        const a = fromWKT('POLYGON ((10.01 10, 10 5, 5 5, 5 10, 10.01 10))');
        const b = fromWKT('POLYGON ((10 15, 15 15, 15 7, 10.01 7, 10 15))');
        assert.equal(toWKT(union(a, b, { gridSize: 1 })), 'POLYGON ((10 5, 5 5, 5 10, 10 10, 10 15, 15 15, 15 7, 10 7, 10 5))');
        assert.equal(toWKT(union(b, a, { gridSize: 1 })), 'POLYGON ((15 15, 15 7, 10 7, 10 5, 5 5, 5 10, 10 10, 10 15, 15 15))');
        assert.equal(toWKT(union(a, b, { gridSize: 0.01 })), 'POLYGON ((10 5, 5 5, 5 10, 10.01 10, 10 15, 15 15, 15 7, 10.01 7, 10.01 8.85, 10 5))');
        assert.equal(toWKT(union(b, a, { gridSize: 0.01 })), 'POLYGON ((15 15, 15 7, 10.01 7, 10.01 8.85, 10 5, 5 5, 5 10, 10.01 10, 10 15, 15 15))');
    });

    it('(prec) should return union of two partially overlapping polygons', () => {
        const a = fromWKT('POLYGON ((85.55954154387994 100, 92.87214039753759 100, 94.7254728121147 100, 98.69765702432045 96.38825885127041, 85.55954154387994 100))');
        const b = fromWKT('POLYGON ((80.20688423699171 99.99999999999999, 100.00000000000003 99.99999999999997, 100.00000000000003 88.87471526860915, 80.20688423699171 99.99999999999999))');
        assert.equal(toWKT(union(a, b, { gridSize: 1e-2 })), 'POLYGON ((92.87 100, 94.73 100, 100 100, 100 88.87, 80.21 100, 85.56 100, 92.87 100))');
        assert.equal(toWKT(union(b, a, { gridSize: 1e-2 })), 'POLYGON ((85.56 100, 92.87 100, 94.73 100, 100 100, 100 88.87, 80.21 100, 85.56 100))');
    });

    it('(prec) should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => union(a, b, { gridSize: 0 }), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
