import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { bounds } from '../../src/measurement/bounds.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('bounds', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry bounds', () => {
        assert.deepEqual(bounds(fromWKT('POINT (0 1)')), [ 0, 1, 0, 1 ]);
        assert.deepEqual(bounds(fromWKT('POINT Z (0 1 2)')), [ 0, 1, 0, 1 ]);
        assert.deepEqual(bounds(fromWKT('POINT M (0 1 3)')), [ 0, 1, 0, 1 ]);
        assert.deepEqual(bounds(fromWKT('POINT ZM (0 1 2 3)')), [ 0, 1, 0, 1 ]);

        assert.deepEqual(bounds(fromWKT('LINESTRING (0 1, 4 5)')), [ 0, 1, 4, 5 ]);
        assert.deepEqual(bounds(fromWKT('LINESTRING Z (0 1 2, 4 5 6)')), [ 0, 1, 4, 5 ]);
        assert.deepEqual(bounds(fromWKT('LINESTRING M (0 1 3, 4 5 7)')), [ 0, 1, 4, 5 ]);
        assert.deepEqual(bounds(fromWKT('LINESTRING ZM (0 1 2 3, 4 5 6 7)')), [ 0, 1, 4, 5 ]);

        assert.deepEqual(bounds(fromWKT('POLYGON ((0 1, 7 6, 11 10, 0 1))')), [ 0, 1, 11, 10 ]);
        assert.deepEqual(bounds(fromWKT('POLYGON Z ((0 1 2, 7 6 5, 11 10 9, 0 1 2))')), [ 0, 1, 11, 10 ]);
        assert.deepEqual(bounds(fromWKT('POLYGON M ((0 1 3, 7 6 4, 11 10 8, 0 1 3))')), [ 0, 1, 11, 10 ]);
        assert.deepEqual(bounds(fromWKT('POLYGON ZM ((0 1 2 3, 7 6 5 4, 11 10 9 8, 0 1 2 3))')), [ 0, 1, 11, 10 ]);

        assert.deepEqual(bounds(fromWKT('MULTIPOINT ((0 1), (2 3), (2 2))')), [ 0, 1, 2, 3 ]);
        assert.deepEqual(bounds(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))')), [ 1, 1, 4, 4 ]);
        assert.deepEqual(bounds(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))')), [ 0, 0, 3, 3 ]);
        assert.deepEqual(bounds(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 3 4))')), [ 0, 0, 3, 4 ]);

        assert.deepEqual(bounds(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), [ 0, 0, 2, 1 ]);
        assert.deepEqual(bounds(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))')), [ 0, 0, 3, 1 ]);
        assert.deepEqual(bounds(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))')), [ 0, -1, 2, 1 ]);
        assert.deepEqual(bounds(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))')), [ 0, 0, 2, 1 ]);
        assert.deepEqual(bounds(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))')), [ 0, 0, 12, 11 ]);
    });

    it('should throw on empty geometry', () => {
        const expectedError = {
            name: 'GEOSError',
            message: 'Cannot calculate bounds of an empty geometry',
        };
        assert.throws(() => bounds(fromWKT('POINT EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('LINESTRING EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('POLYGON EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('MULTIPOINT EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('MULTILINESTRING EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('MULTIPOLYGON EMPTY')), expectedError);
        assert.throws(() => bounds(fromWKT('GEOMETRYCOLLECTION EMPTY')), expectedError);
    });

});
