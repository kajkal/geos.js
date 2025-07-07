import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { isGeometry } from '../../src/predicates/isGeometry.mjs';
import { geometryCollection, point } from '../../src/helpers/helpers.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('isGeometry', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return whether value is geometry', () => {
        assert.equal(isGeometry(fromWKT('POINT EMPTY')), true);
        assert.equal(isGeometry(point([ 0, 0 ])), true);
        assert.equal(isGeometry(geometryCollection([])), true);
        assert.equal(isGeometry({ type: 'Point', coordinates: [ 0, 0 ] }), false);
        assert.equal(isGeometry({ type: 'Feature', geometry: { type: 'Point', coordinates: [ 0, 0 ] }, properties: null }), false);
        assert.equal(isGeometry({}), false);
        assert.equal(isGeometry(undefined), false);
        assert.equal(isGeometry(null), false);
    });

});
