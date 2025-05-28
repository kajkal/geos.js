import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { isEmpty } from '../../src/predicates/isEmpty.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('isEmpty', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return whether geometry is empty', () => {
        assert.equal(isEmpty(fromWKT('POINT EMPTY')), true);
        assert.equal(isEmpty(fromWKT('POINT (1 2)')), false);

        assert.equal(isEmpty(fromWKT('LINESTRING EMPTY')), true);
        assert.equal(isEmpty(fromWKT('LINESTRING (1 0, 5 0)')), false);

        assert.equal(isEmpty(fromWKT('POLYGON EMPTY')), true);
        assert.equal(isEmpty(fromWKT('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')), false);

        assert.equal(isEmpty(fromWKT('MULTIPOINT EMPTY')), true);
        assert.equal(isEmpty(fromWKT('MULTIPOINT ((1 1), (2 2))')), false);

        assert.equal(isEmpty(fromWKT('MULTILINESTRING EMPTY')), true);
        assert.equal(isEmpty(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))')), false);

        assert.equal(isEmpty(fromWKT('MULTIPOLYGON EMPTY')), true);
        assert.equal(isEmpty(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))')), false);

        assert.equal(isEmpty(fromWKT('GEOMETRYCOLLECTION EMPTY')), true);
        assert.equal(isEmpty(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))')), false);

        assert.equal(isEmpty(fromWKT('CIRCULARSTRING EMPTY')), true);
        assert.equal(isEmpty(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), false);

        assert.equal(isEmpty(fromWKT('COMPOUNDCURVE EMPTY')), true);
        assert.equal(isEmpty(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))')), false);

        assert.equal(isEmpty(fromWKT('CURVEPOLYGON EMPTY')), true);
        assert.equal(isEmpty(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))')), false);

        assert.equal(isEmpty(fromWKT('MULTICURVE EMPTY')), true);
        assert.equal(isEmpty(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))')), false);

        assert.equal(isEmpty(fromWKT('MULTISURFACE EMPTY')), true);
        assert.equal(isEmpty(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))')), false);
    });

});
