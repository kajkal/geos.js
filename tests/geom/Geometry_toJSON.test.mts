import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { point } from '../../src/helpers/helpers.mjs';


describe('Geometry#toJSON', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return geometry GeoJSON representation', () => {
        const a = point([ 2, 8 ]);
        assert.deepEqual(a.toJSON(), { type: 'Point', coordinates: [ 2, 8 ] });
    });

    it('should stringify geometry as GeoJSON string', () => {
        const a = point([ 2, 8 ]);
        assert.deepEqual(JSON.stringify(a), '{"type":"Point","coordinates":[2,8]}');
    });

});
