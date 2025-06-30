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
        assert.deepEqual(a.toJSON(), {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ 2, 8 ] },
            properties: null,
            id: undefined,
        });
    });

    it('should stringify geometry as GeoJSON string', () => {
        const a = point([ 2, 8 ]);
        assert.deepEqual(JSON.stringify(a), '{"type":"Feature","geometry":{"type":"Point","coordinates":[2,8]},"properties":null}');
    });

});
