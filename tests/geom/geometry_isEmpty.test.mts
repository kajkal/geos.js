import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('Geometry::isEmpty', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return whether geometry is empty', () => {
        assert.equal(fromWKT('POINT EMPTY').isEmpty(), true);
        assert.equal(fromWKT('POINT (1 2)').isEmpty(), false);

        assert.equal(fromWKT('LINESTRING EMPTY').isEmpty(), true);
        assert.equal(fromWKT('LINESTRING (1 0, 5 0)').isEmpty(), false);

        assert.equal(fromWKT('POLYGON EMPTY').isEmpty(), true);
        assert.equal(fromWKT('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))').isEmpty(), false);

        assert.equal(fromWKT('MULTIPOINT EMPTY').isEmpty(), true);
        assert.equal(fromWKT('MULTIPOINT ((1 1), (2 2))').isEmpty(), false);

        assert.equal(fromWKT('MULTILINESTRING EMPTY').isEmpty(), true);
        assert.equal(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))').isEmpty(), false);

        assert.equal(fromWKT('MULTIPOLYGON EMPTY').isEmpty(), true);
        assert.equal(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))').isEmpty(), false);

        assert.equal(fromWKT('GEOMETRYCOLLECTION EMPTY').isEmpty(), true);
        assert.equal(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))').isEmpty(), false);

        assert.equal(fromWKT('CIRCULARSTRING EMPTY').isEmpty(), true);
        assert.equal(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)').isEmpty(), false);

        assert.equal(fromWKT('COMPOUNDCURVE EMPTY').isEmpty(), true);
        assert.equal(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))').isEmpty(), false);

        assert.equal(fromWKT('CURVEPOLYGON EMPTY').isEmpty(), true);
        assert.equal(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))').isEmpty(), false);

        assert.equal(fromWKT('MULTICURVE EMPTY').isEmpty(), true);
        assert.equal(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))').isEmpty(), false);

        assert.equal(fromWKT('MULTISURFACE EMPTY').isEmpty(), true);
        assert.equal(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))').isEmpty(), false);
    });

});
