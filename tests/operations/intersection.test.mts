import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { intersection } from '../../src/operations/intersection.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';


describe('intersection', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return point for intersection of polygon with contained point', () => {
        const a = fromWKT('POLYGON((1 1,1 5,5 5,5 1,1 1))');
        const b = fromWKT('POINT(2 2)');
        assert.equal(toWKT(intersection(a, b)), 'POINT (2 2)');
        assert.equal(toWKT(intersection(b, a)), 'POINT (2 2)');
    });

    it('should return line segment for intersection of line with polygon', () => {
        const a = fromWKT('POLYGON((0 0,2 0,2 2,0 2,0 0))');
        const b = fromWKT('LINESTRING(-1 1,3 1)');
        assert.equal(toWKT(intersection(a, b)), 'LINESTRING (0 1, 2 1)');
        assert.equal(toWKT(intersection(b, a)), 'LINESTRING (0 1, 2 1)');
    });

    it('should return intersection of two empty polygons', () => {
        const a = fromWKT('POLYGON EMPTY');
        const b = fromWKT('POLYGON EMPTY');
        assert.equal(toWKT(intersection(a, b)), 'POLYGON EMPTY');
        assert.equal(toWKT(intersection(b, a)), 'POLYGON EMPTY');
    });

    it('should return same polygon for intersection with identical polygon', () => {
        const a = fromWKT('POLYGON((0 0,0 1,1 1,1 0,0 0))');
        const b = fromWKT('POLYGON((0 0,0 1,1 1,1 0,0 0))');
        assert.equal(toWKT(intersection(a, b)), 'POLYGON ((0 1, 1 1, 1 0, 0 0, 0 1))'); // .normalize() to get consistent coords order
        assert.equal(toWKT(intersection(b, a)), 'POLYGON ((0 1, 1 1, 1 0, 0 0, 0 1))');
    });

    it('should return intersection of two overlapping polygons', () => {
        const a = fromWKT('POLYGON((0 0,2 0,2 2,0 2,0 0))');
        const b = fromWKT('POLYGON((1 1,3 1,3 3,1 3,1 1))');
        assert.equal(toWKT(intersection(a, b)), 'POLYGON ((2 2, 2 1, 1 1, 1 2, 2 2))');
        assert.equal(toWKT(intersection(b, a)), 'POLYGON ((1 1, 1 2, 2 2, 2 1, 1 1))');
    });

    it('should return empty geometry for disjoint polygons', () => {
        const a = fromWKT('POLYGON((0 0,1 0,1 1,0 1,0 0))');
        const b = fromWKT('POLYGON((2 2,3 2,3 3,2 3,2 2))');
        assert.equal(toWKT(intersection(a, b)), 'POLYGON EMPTY');
        assert.equal(toWKT(intersection(b, a)), 'POLYGON EMPTY');
    });

    it('should return collection of intersections of multi polygon and polygon', () => {
        const a = fromWKT('MULTIPOLYGON(((0 0,5 10,10 0,0 0),(1 1,1 2,2 2,2 1,1 1),(100 100,100 102,102 102,102 100,100 100)))');
        const b = fromWKT('POLYGON((0 1,0 2,10 2,10 1,0 1))');
        assert.equal(toWKT(intersection(a, b)), 'GEOMETRYCOLLECTION (POLYGON ((1 2, 1 1, 0.5 1, 1 2)), POLYGON ((9.5 1, 2 1, 2 2, 9 2, 9.5 1)), LINESTRING (1 2, 2 2), LINESTRING (2 1, 1 1))');
        assert.equal(toWKT(intersection(b, a)), 'GEOMETRYCOLLECTION (POLYGON ((9 2, 9.5 1, 2 1, 2 2, 9 2)), POLYGON ((0.5 1, 1 2, 1 1, 0.5 1)), LINESTRING (1 2, 2 2), LINESTRING (2 1, 1 1))');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => intersection(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

    it('(prec) should return empty geometry for disjoint line strings', () => {
        const a = fromWKT('LINESTRING(0 0, 10 0)');
        const b = fromWKT('LINESTRING(0 1, 10 1)');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'LINESTRING EMPTY');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'LINESTRING EMPTY');
    });

    it('(prec) should return intersection of two overlapping line strings', () => {
        const a = fromWKT('LINESTRING(0 0, 10 0)');
        const b = fromWKT('LINESTRING(0 1, 10 1)');
        assert.equal(toWKT(intersection(a, b, { gridSize: 10 })), 'LINESTRING (0 0, 10 0)');
        assert.equal(toWKT(intersection(b, a, { gridSize: 10 })), 'LINESTRING (0 0, 10 0)');
    });

    it('(prec) should return point intersection of two line strings', () => {
        const a = fromWKT('LINESTRING(0 0, 10 0)');
        const b = fromWKT('LINESTRING(0 1, 10 0)');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'POINT (10 0)');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'POINT (10 0)');
    });

    it('(prec) should return collection of intersections of two line strings', () => {
        const a = fromWKT('LINESTRING(0 0, 10 0)');
        const b = fromWKT('LINESTRING(9 0, 12 0, 12 20, 4 0, 2 0, 2 10, 0 10, 0 -10)');
        assert.equal(toWKT(intersection(a, b, { gridSize: 2 })), 'GEOMETRYCOLLECTION (LINESTRING (2 0, 4 0), POINT (10 0), POINT (0 0))');
        assert.equal(toWKT(intersection(b, a, { gridSize: 2 })), 'GEOMETRYCOLLECTION (LINESTRING (4 0, 2 0), POINT (0 0), POINT (10 0))');
    });

    it('(prec) should return intersection of polygon with contained point', () => {
        const a = fromWKT('POLYGON((1 1,1 5,5 5,5 1,1 1))');
        const b = fromWKT('POINT(2 2)');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'POINT (2 2)');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'POINT (2 2)');
    });

    it('(prec) should return intersection of two empty polygons', () => {
        const a = fromWKT('POLYGON EMPTY');
        const b = fromWKT('POLYGON EMPTY');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'POLYGON EMPTY');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'POLYGON EMPTY');
    });

    it('(prec) should return intersection of multi polygon and polygon', () => {
        const a = fromWKT('MULTIPOLYGON(((0 0,0 10,10 10,10 0,0 0)))');
        const b = fromWKT('POLYGON((-1 1,-1 2,2 2,2 1,-1 1))');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'POLYGON ((0 2, 2 2, 2 1, 0 1, 0 2))');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'POLYGON ((2 2, 2 1, 0 1, 0 2, 2 2))');
    });

    it('(prec) should return intersection of two overlapping polygons', () => {
        const a = fromWKT('POLYGON ((0 0, 2.1234 0, 2.1234 2.1234, 0 2.1234, 0 0))');
        const b = fromWKT('POLYGON ((1.1234 1.1234, 3 1.1234, 3 3, 1.1234 3, 1.1234 1.1234))');
        assert.equal(toWKT(intersection(a, b, { gridSize: 1e-2 })), 'POLYGON ((2.12 2.12, 2.12 1.12, 1.12 1.12, 1.12 2.12, 2.12 2.12))');
        assert.equal(toWKT(intersection(b, a, { gridSize: 1e-2 })), 'POLYGON ((1.12 1.12, 1.12 2.12, 2.12 2.12, 2.12 1.12, 1.12 1.12))');
    });

    it('(prec) should return collection of intersections of multi polygon and polygon', () => {
        const a = fromWKT('MULTIPOLYGON(((0 0,5 10,10 0,0 0),(1 1,1 2,2 2,2 1,1 1),(100 100,100 102,102 102,102 100,100 100)))');
        const b = fromWKT('POLYGON((0 1,0 2,10 2,10 1,0 1))');
        assert.equal(toWKT(intersection(a, b, { gridSize: 0 })), 'GEOMETRYCOLLECTION (POLYGON ((1 2, 1 1, 0.5 1, 1 2)), POLYGON ((9.5 1, 2 1, 2 2, 9 2, 9.5 1)), LINESTRING (1 2, 2 2), LINESTRING (2 1, 1 1))');
        assert.equal(toWKT(intersection(b, a, { gridSize: 0 })), 'GEOMETRYCOLLECTION (POLYGON ((9 2, 9.5 1, 2 1, 2 2, 9 2)), POLYGON ((0.5 1, 1 2, 1 1, 0.5 1)), LINESTRING (1 2, 2 2), LINESTRING (2 1, 1 1))');
    });

    it('(prec) should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => intersection(a, b, { gridSize: 0 }), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
