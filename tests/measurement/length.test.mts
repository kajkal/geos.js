import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { length } from '../../src/measurement/length.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('length', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry length', () => {
        assert.equal(length(fromWKT('POINT EMPTY')), 0);
        assert.equal(length(fromWKT('POINT (1 2)')), 0);

        assert.equal(length(fromWKT('LINESTRING EMPTY')), 0);
        assert.equal(length(fromWKT('LINESTRING (1 0, 5 0)')), 4);
        assert.equal(length(fromWKT('LINESTRING (0 0, 1 1)')), Math.sqrt(2));

        assert.equal(length(fromWKT('POLYGON EMPTY')), 0);
        assert.equal(length(fromWKT('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')), 4);

        assert.equal(length(fromWKT('MULTIPOINT EMPTY')), 0);
        assert.equal(length(fromWKT('MULTIPOINT ((1 1), (2 2))')), 0);

        assert.equal(length(fromWKT('MULTILINESTRING EMPTY')), 0);
        assert.equal(length(fromWKT('MULTILINESTRING ((1 1, 2 2), (3 3, 4 4))')), 2 * Math.sqrt(2));

        assert.equal(length(fromWKT('MULTIPOLYGON EMPTY')), 0);
        assert.equal(length(fromWKT('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))')), 8);

        assert.equal(length(fromWKT('GEOMETRYCOLLECTION EMPTY')), 0);
        assert.equal(length(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1))')), Math.sqrt(2));

        assert.equal(length(fromWKT('CIRCULARSTRING EMPTY')), 0);
        assert.equal(length(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), Math.PI);

        assert.equal(length(fromWKT('COMPOUNDCURVE EMPTY')), 0);
        assert.equal(length(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))')), Math.PI + 1);

        assert.equal(length(fromWKT('CURVEPOLYGON EMPTY')), 0);
        assert.equal(length(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))')), 2 * Math.PI);

        assert.equal(length(fromWKT('MULTICURVE EMPTY')), 0);
        assert.equal(length(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))')), Math.sqrt(2) + Math.PI);

        assert.equal(length(fromWKT('MULTISURFACE EMPTY')), 0);
        assert.equal(length(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))')), 4 + Math.PI * 2);
    });

});
