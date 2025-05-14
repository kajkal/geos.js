import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('Geometry::area', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry area', () => {
        assert.equal(fromWKT('POINT EMPTY').area(), 0);
        assert.equal(fromWKT('POINT(1 1)').area(), 0);

        assert.equal(fromWKT('LINESTRING EMPTY').area(), 0);
        assert.equal(fromWKT('LINESTRING(0 0, 1 1)').area(), 0);

        assert.equal(fromWKT('POLYGON EMPTY').area(), 0);
        assert.equal(fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))').area(), 1);

        assert.equal(fromWKT('MULTIPOINT EMPTY').area(), 0);
        assert.equal(fromWKT('MULTIPOINT((1 1),(2 2))').area(), 0);

        assert.equal(fromWKT('MULTILINESTRING EMPTY').area(), 0);
        assert.equal(fromWKT('MULTILINESTRING((0 0, 1 1),(2 2, 3 3))').area(), 0);

        assert.equal(fromWKT('MULTIPOLYGON EMPTY').area(), 0);
        assert.equal(fromWKT('MULTIPOLYGON(((0 0, 0 1, 1 1, 1 0, 0 0)),((2 2, 2 3, 3 3, 2 2)))').area(), 1.5);

        assert.equal(fromWKT('GEOMETRYCOLLECTION EMPTY').area(), 0);
        assert.equal(fromWKT('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1), POLYGON((2 2, 2 3, 3 3, 2 2)))').area(), 0.5);

        assert.equal(fromWKT('CIRCULARSTRING EMPTY').area(), 0);
        assert.equal(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)').area(), 0);

        assert.equal(fromWKT('COMPOUNDCURVE EMPTY').area(), 0);
        assert.equal(fromWKT('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))').area(), 0);

        assert.equal(fromWKT('CURVEPOLYGON EMPTY').area(), 0);
        assert.equal(fromWKT('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))').area(), Math.PI);

        assert.equal(fromWKT('MULTICURVE EMPTY').area(), 0);
        assert.equal(fromWKT('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))').area(), 0);

        assert.equal(fromWKT('MULTISURFACE EMPTY').area(), 0);
        assert.equal(fromWKT('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))').area(), 1 + Math.PI);
    });

});
