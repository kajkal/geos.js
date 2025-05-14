import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('Geometry::bbox', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry bbox', () => {
        assert.deepEqual(fromWKT('POINT (0 1)').bbox(), [ 0, 1, 0, 1 ]);
        assert.deepEqual(fromWKT('POINT Z (0 1 2)').bbox(), [ 0, 1, 0, 1 ]);
        assert.deepEqual(fromWKT('POINT M (0 1 3)').bbox(), [ 0, 1, 0, 1 ]);
        assert.deepEqual(fromWKT('POINT ZM (0 1 2 3)').bbox(), [ 0, 1, 0, 1 ]);

        assert.deepEqual(fromWKT('LINESTRING (0 1, 4 5)').bbox(), [ 0, 1, 4, 5 ]);
        assert.deepEqual(fromWKT('LINESTRING Z (0 1 2, 4 5 6)').bbox(), [ 0, 1, 4, 5 ]);
        assert.deepEqual(fromWKT('LINESTRING M (0 1 3, 4 5 7)').bbox(), [ 0, 1, 4, 5 ]);
        assert.deepEqual(fromWKT('LINESTRING ZM (0 1 2 3, 4 5 6 7)').bbox(), [ 0, 1, 4, 5 ]);

        assert.deepEqual(fromWKT('POLYGON ((0 1, 7 6, 11 10, 0 1))').bbox(), [ 0, 1, 11, 10 ]);
        assert.deepEqual(fromWKT('POLYGON Z ((0 1 2, 7 6 5, 11 10 9, 0 1 2))').bbox(), [ 0, 1, 11, 10 ]);
        assert.deepEqual(fromWKT('POLYGON M ((0 1 3, 7 6 4, 11 10 8, 0 1 3))').bbox(), [ 0, 1, 11, 10 ]);
        assert.deepEqual(fromWKT('POLYGON ZM ((0 1 2 3, 7 6 5 4, 11 10 9 8, 0 1 2 3))').bbox(), [ 0, 1, 11, 10 ]);

        assert.deepEqual(fromWKT('MULTIPOINT ((0 1), (2 3), (2 2))').bbox(), [ 0, 1, 2, 3 ]);
        assert.deepEqual(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))').bbox(), [ 1, 1, 4, 4 ]);
        assert.deepEqual(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))').bbox(), [ 0, 0, 3, 3 ]);
        assert.deepEqual(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 3 4))').bbox(), [ 0, 0, 3, 4 ]);

        assert.deepEqual(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)').bbox(), [ 0, 0, 2, 1 ]);
        assert.deepEqual(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))').bbox(), [ 0, 0, 3, 1 ]);
        assert.deepEqual(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))').bbox(), [ 0, -1, 2, 1 ]);
        assert.deepEqual(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))').bbox(), [ 0, 0, 2, 1 ]);
        assert.deepEqual(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))').bbox(), [ 0, 0, 12, 11 ]);
    });

    it('should throw on empty geometry', () => {
        const expectedError = {
            name: 'GeosError',
            message: 'Cannot calculate bbox of empty geometry',
        };
        assert.throws(() => fromWKT('POINT EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('LINESTRING EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('POLYGON EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('MULTIPOINT EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('MULTILINESTRING EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('MULTIPOLYGON EMPTY').bbox(), expectedError);
        assert.throws(() => fromWKT('GEOMETRYCOLLECTION EMPTY').bbox(), expectedError);
    });

});
