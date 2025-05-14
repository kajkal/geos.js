import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('Geometry::length', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry length', () => {
        assert.equal(fromWKT('POINT EMPTY').length(), 0);
        assert.equal(fromWKT('POINT (1 2)').length(), 0);

        assert.equal(fromWKT('LINESTRING EMPTY').length(), 0);
        assert.equal(fromWKT('LINESTRING (1 0, 5 0)').length(), 4);
        assert.equal(fromWKT('LINESTRING (0 0, 1 1)').length(), Math.sqrt(2));

        assert.equal(fromWKT('POLYGON EMPTY').length(), 0);
        assert.equal(fromWKT('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))').length(), 4);

        assert.equal(fromWKT('MULTIPOINT EMPTY').length(), 0);
        assert.equal(fromWKT('MULTIPOINT ((1 1), (2 2))').length(), 0);

        assert.equal(fromWKT('MULTILINESTRING EMPTY').length(), 0);
        assert.equal(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))').length(), 2 * Math.sqrt(2));

        assert.equal(fromWKT('MULTIPOLYGON EMPTY').length(), 0);
        assert.equal(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))').length(), 8);

        assert.equal(fromWKT('GEOMETRYCOLLECTION EMPTY').length(), 0);
        assert.equal(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))').length(), Math.sqrt(2));

        assert.equal(fromWKT('CIRCULARSTRING EMPTY').length(), 0);
        assert.equal(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)').length(), Math.PI);

        assert.equal(fromWKT('COMPOUNDCURVE EMPTY').length(), 0);
        assert.equal(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))').length(), Math.PI + 1);

        assert.equal(fromWKT('CURVEPOLYGON EMPTY').length(), 0);
        assert.equal(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))').length(), 2 * Math.PI);

        assert.equal(fromWKT('MULTICURVE EMPTY').length(), 0);
        assert.equal(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))').length(), Math.sqrt(2) + Math.PI);

        assert.equal(fromWKT('MULTISURFACE EMPTY').length(), 0);
        assert.equal(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))').length(), 4 + Math.PI * 2);
    });

});
