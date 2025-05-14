import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';


describe('Geometry::normalize', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should normalize point', () => {
        // point does not normalize to anything else
        const a = fromWKT('POINT (0 100)');
        assert.equal(toWKT(a.normalize()), 'POINT (0 100)');
    });

    it('should normalize line string', () => {
        // should 'sort' coordinates
        const a = fromWKT('LINESTRING(100 0,100 100,0 100,0 0)');
        assert.equal(toWKT(a.normalize()), 'LINESTRING (0 0, 0 100, 100 100, 100 0)');
        const b = fromWKT('LINESTRING M (100 0 0, 100 100 1, 0 100 2, 0 0 3)');
        assert.equal(toWKT(b.normalize()), 'LINESTRING M (0 0 3, 0 100 2, 100 100 1, 100 0 0)');
    });

    it('should normalize closed line string', () => {
        const a = fromWKT('LINESTRING (8 15, 15 8, 22 15, 15 22, 8 15)');
        assert.equal(toWKT(a.normalize()), 'LINESTRING (8 15, 15 22, 22 15, 15 8, 8 15)');
        const b = fromWKT('LINESTRING M (8 15 0, 15 8 1, 22 15 2, 15 22 3, 8 15 0)');
        assert.equal(toWKT(b.normalize()), 'LINESTRING M (8 15 0, 15 22 3, 22 15 2, 15 8 1, 8 15 0)');
    });

    it('should normalize zero length line string', () => {
        const a = fromWKT('LINESTRING (0 1, 0 1)');
        assert.equal(toWKT(a.normalize()), 'LINESTRING (0 1, 0 1)');
        const b = fromWKT('LINESTRING (0 1, 0 1, 0 1)');
        assert.equal(toWKT(b.normalize()), 'LINESTRING (0 1, 0 1, 0 1)');
    });

    it('should normalize polygon', () => {
        // should orient rings: exterior ring CW, holes CCW
        const a = fromWKT(
            'POLYGON (' +
            '(0 0,100 0,100 100,0 100,0 0),' + // CCW
            '(10 10,20 10,20 20,10 20,10 10),' + // CCW, leftmost
            '(40 10,40 20,60 20,60 10,40 10)' + // CW, rightmost
            ')',
        );
        assert.equal(toWKT(a.normalize()),
            'POLYGON (' +
            '(0 0, 0 100, 100 100, 100 0, 0 0), ' + // CW
            '(40 10, 60 10, 60 20, 40 20, 40 10), ' + // CCW, rightmost
            '(10 10, 20 10, 20 20, 10 20, 10 10)' + // CCW, leftmost
            ')',
        );
    });

    it('should normalize multi point', () => {
        const a = fromWKT(
            'MULTIPOINT (' +
            '(0 100), ' + // leftmost
            '(5 6)' + // rightmost
            ')',
        );
        assert.equal(toWKT(a.normalize()),
            'MULTIPOINT (' +
            '(5 6), ' + // rightmost
            '(0 100)' + // leftmost
            ')',
        );
    });

    it('should normalize multi line string', () => {
        const a = fromWKT(
            'MULTILINESTRING(' +
            '(15 25, 25 52),' + // rightmost vertex @ 25
            '(0 0, 0 100, 100 100, 100 0)' + // rightmost vertex @ 100
            ')',
        );
        assert.equal(toWKT(a.normalize()),
            'MULTILINESTRING (' +
            '(0 0, 0 100, 100 100, 100 0), ' + // rightmost vertex @ 100
            '(15 25, 25 52)' + // rightmost vertex @ 25
            ')',
        );
    });

    it('should normalize multi polygon', () => {
        const a = fromWKT(
            'MULTIPOLYGON(' +
            '((0 0, 0 1, 1 1, 1 0, 0 0)),' + // leftmost
            '((2 0, 2 1, 3 1, 3 0, 2 0))' + // rightmost
            ')',
        );
        assert.equal(toWKT(a.normalize()),
            'MULTIPOLYGON (' +
            '((2 0, 2 1, 3 1, 3 0, 2 0)), ' + // rightmost
            '((0 0, 0 1, 1 1, 1 0, 0 0))' + // leftmost
            ')',
        );
    });

    it('should normalize geometry collection', () => {
        const a = fromWKT(
            'GEOMETRYCOLLECTION(' +
            'MULTIPOINT ((0 100), (5 6)),' + // leftmost | rightmost
            'POINT(10 4),' + // more on the right than the multipoint
            'MULTILINESTRING((15 25, 25 52),(0 0, 0 100, 100 100, 100 0)),' + // rightmost vertex @ 25 | rightmost vertex @ 100
            'LINESTRING(100 0,100 100,0 100,0 0),' +
            'MULTIPOLYGON(((0 0, 0 1, 1 1, 1 0, 0 0)),((2 0, 2 1, 3 1, 3 0, 2 0))),' + // leftmost | rightmost
            'POLYGON ((0 0,100 0,100 100,0 100,0 0),(10 10,20 10,20 20,10 20,10 10),(40 10,40 20,60 20,60 10,40 10))' + // CCW | CCW, leftmost | CW, rightmost
            ')',
        );
        assert.equal(toWKT(a.normalize()),
            'GEOMETRYCOLLECTION (' +
            'MULTIPOLYGON (((2 0, 2 1, 3 1, 3 0, 2 0)), ((0 0, 0 1, 1 1, 1 0, 0 0))), ' + // rightmost | leftmost
            'POLYGON ((0 0, 0 100, 100 100, 100 0, 0 0), (40 10, 60 10, 60 20, 40 20, 40 10), (10 10, 20 10, 20 20, 10 20, 10 10)), ' + // CW | CWW, rightmost | CWW, leftmost
            'MULTILINESTRING ((0 0, 0 100, 100 100, 100 0), (15 25, 25 52)), ' + // rightmost vertex @ 100 | rightmost vertex @ 25
            'LINESTRING (0 0, 0 100, 100 100, 100 0), ' +
            'MULTIPOINT ((5 6), (0 100)), ' + // rightmost | leftmost
            'POINT (10 4)' + // more on the right than the multipoint
            ')',
        );
    });

});
