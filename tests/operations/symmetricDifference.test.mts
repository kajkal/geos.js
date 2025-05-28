import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { symmetricDifference } from '../../src/operations/symmetricDifference.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';


describe('symmetricDifference', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return symmetric difference of two geometries', () => {
        const a = fromWKT('LINESTRING(50 100, 50 200)');
        const b = fromWKT('LINESTRING(50 50, 50 150)');
        assert.equal(toWKT(symmetricDifference(a, b)), 'MULTILINESTRING ((50 150, 50 200), (50 50, 50 100))');
        assert.equal(toWKT(symmetricDifference(b, a)), 'MULTILINESTRING ((50 50, 50 100), (50 150, 50 200))');
    });

    it('should return symmetric difference of two identical geometries', () => {
        const a = fromWKT('LINESTRING(50 100, 50 200)');
        const b = fromWKT('LINESTRING(50 100, 50 200)');
        assert.equal(toWKT(symmetricDifference(a, b)), 'LINESTRING EMPTY');
        assert.equal(toWKT(symmetricDifference(b, a)), 'LINESTRING EMPTY');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        const b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => symmetricDifference(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

    it('(prec) should return symmetric difference of two geometries', () => {
        const a = fromWKT('LINESTRING(50 100, 50 200)');
        const b = fromWKT('LINESTRING(50 50, 50 150)');
        assert.equal(toWKT(symmetricDifference(a, b, { gridSize: 15 })), 'MULTILINESTRING ((45 150, 45 195), (45 45, 45 105))');
        assert.equal(toWKT(symmetricDifference(b, a, { gridSize: 15 })), 'MULTILINESTRING ((45 45, 45 105), (45 150, 45 195))');
    });

});
