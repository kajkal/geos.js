import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { difference } from '../../src/operations/difference.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';


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
