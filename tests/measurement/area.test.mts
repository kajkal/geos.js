import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { area } from '../../src/measurement/area.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('area', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry area', () => {
        assert.equal(area(fromWKT('POINT EMPTY')), 0);
        assert.equal(area(fromWKT('POINT(1 1)')), 0);

        assert.equal(area(fromWKT('LINESTRING EMPTY')), 0);
        assert.equal(area(fromWKT('LINESTRING(0 0, 1 1)')), 0);

        assert.equal(area(fromWKT('POLYGON EMPTY')), 0);
        assert.equal(area(fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))')), 1);

        assert.equal(area(fromWKT('MULTIPOINT EMPTY')), 0);
        assert.equal(area(fromWKT('MULTIPOINT((1 1),(2 2))')), 0);

        assert.equal(area(fromWKT('MULTILINESTRING EMPTY')), 0);
        assert.equal(area(fromWKT('MULTILINESTRING((0 0, 1 1),(2 2, 3 3))')), 0);

        assert.equal(area(fromWKT('MULTIPOLYGON EMPTY')), 0);
        assert.equal(area(fromWKT('MULTIPOLYGON(((0 0, 0 1, 1 1, 1 0, 0 0)),((2 2, 2 3, 3 3, 2 2)))')), 1.5);

        assert.equal(area(fromWKT('GEOMETRYCOLLECTION EMPTY')), 0);
        assert.equal(area(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1), POLYGON((2 2, 2 3, 3 3, 2 2)))')), 0.5);

        assert.equal(area(fromWKT('CIRCULARSTRING EMPTY')), 0);
        assert.equal(area(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), 0);

        assert.equal(area(fromWKT('COMPOUNDCURVE EMPTY')), 0);
        assert.equal(area(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))')), 0);

        assert.equal(area(fromWKT('CURVEPOLYGON EMPTY')), 0);
        assert.equal(area(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))')), Math.PI);

        assert.equal(area(fromWKT('MULTICURVE EMPTY')), 0);
        assert.equal(area(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))')), 0);

        assert.equal(area(fromWKT('MULTISURFACE EMPTY')), 0);
        assert.equal(area(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))')), 1 + Math.PI);
    });

});
