import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { difference } from '../../src/operations/difference.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';


describe('difference', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return difference of two line strings', () => {
        const a = fromWKT('LINESTRING (2 8, 10 8)');
        const b = fromWKT('LINESTRING (4 8, 6 8)');
        assert.equal(toWKT(difference(a, b)), 'MULTILINESTRING ((2 8, 4 8), (6 8, 10 8))');
        assert.equal(toWKT(difference(b, a)), 'LINESTRING EMPTY');
    });

    it('should return difference of two polygons', () => {
        const a = fromWKT('POLYGON ((0 4, 5 5, 4 0, 0 4))');
        const b = fromWKT('POLYGON ((0 0, 5 6, 9 5, 0 0))');
        assert.equal(toWKT(difference(a, b)), 'MULTIPOLYGON (((4 4.8, 1.8181818181818181 2.1818181818181817, 0 4, 4 4.8)), ((4 0, 2.5714285714285716 1.4285714285714286, 4.5 2.5, 4 0)))');
        assert.equal(toWKT(difference(a, b, { gridSize: 0.1 })), 'MULTIPOLYGON (((4 4.8, 1.8 2.2, 0 4, 4 4.8)), ((4 0, 2.6 1.4, 4.5 2.5, 4 0)))');
        assert.equal(toWKT(difference(b, a)), 'MULTIPOLYGON (((1.8181818181818181 2.1818181818181817, 2.5714285714285716 1.4285714285714286, 0 0, 1.8181818181818181 2.1818181818181817)), ((5 6, 9 5, 4.5 2.5, 5 5, 4 4.8, 5 6)))');
    });

    it('should handle geometry collections', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (POINT (51 -1), LINESTRING (52 -1, 49 2))');
        const b = fromWKT('POINT (2 3)');
        assert.equal(toWKT(difference(a, b)), 'GEOMETRYCOLLECTION (POINT (51 -1), LINESTRING (52 -1, 49 2))');
        assert.equal(toWKT(difference(b, a)), 'POINT (2 3)');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => difference(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

    it('(prec) should return difference of two line strings', () => {
        const a = fromWKT('LINESTRING (2 8, 10 8)');
        const b = fromWKT('LINESTRING (3.9 8.1, 6.1 7.9)');
        assert.equal(toWKT(difference(a, b, { gridSize: 2 })), 'MULTILINESTRING ((2 8, 4 8), (6 8, 10 8))');
        assert.equal(toWKT(difference(b, a, { gridSize: 2 })), 'LINESTRING EMPTY');
    });

});
