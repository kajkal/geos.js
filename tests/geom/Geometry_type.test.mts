import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('Geometry#type', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return correct value for each supported geometry type', () => {
        assert.equal(fromWKT('POINT EMPTY').type, 'Point');
        assert.equal(fromWKT('LINESTRING EMPTY').type, 'LineString');
        assert.equal(fromWKT('POLYGON EMPTY').type, 'Polygon');
        assert.equal(fromWKT('MULTIPOINT EMPTY').type, 'MultiPoint');
        assert.equal(fromWKT('MULTILINESTRING EMPTY').type, 'MultiLineString');
        assert.equal(fromWKT('MULTIPOLYGON EMPTY').type, 'MultiPolygon');
        assert.equal(fromWKT('GEOMETRYCOLLECTION EMPTY').type, 'GeometryCollection');
        assert.equal(fromWKT('CIRCULARSTRING EMPTY').type, 'CircularString');
        assert.equal(fromWKT('COMPOUNDCURVE EMPTY').type, 'CompoundCurve');
        assert.equal(fromWKT('CURVEPOLYGON EMPTY').type, 'CurvePolygon');
        assert.equal(fromWKT('MULTICURVE EMPTY').type, 'MultiCurve');
        assert.equal(fromWKT('MULTISURFACE EMPTY').type, 'MultiSurface');
    });

});
