import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { POINTER } from '../../src/core/symbols.mjs';
import { lineString } from '../../src/helpers/helpers.mjs';


describe('Geometry#clone', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should clone geometry', () => {
        const original = lineString([ [ 10, 10 ], [ 0, 0 ] ]);
        const copy = original.clone();
        assert.notEqual(original[ POINTER ], copy[ POINTER ]);
        assert.deepEqual(original.toJSON().geometry, { type: 'LineString', coordinates: [ [ 10, 10 ], [ 0, 0 ] ] });
        assert.deepEqual(copy.toJSON().geometry, { type: 'LineString', coordinates: [ [ 10, 10 ], [ 0, 0 ] ] });
        original.normalize(); // mutate original
        assert.deepEqual(original.toJSON().geometry, { type: 'LineString', coordinates: [ [ 0, 0 ], [ 10, 10 ] ] });
        assert.deepEqual(copy.toJSON().geometry, { type: 'LineString', coordinates: [ [ 10, 10 ], [ 0, 0 ] ] });
    });

    it('should clone geometry extra attributes like id or props', () => {
        const original = lineString([ [ 10, 10 ], [ 0, 0 ] ], { id: 0, properties: { some: 'prop' } });
        const copy = original.clone();
        assert.equal(copy.id, 0);
        assert.equal(copy.props, original.props);
        assert.deepEqual(copy.props, { some: 'prop' });
        assert.deepEqual(copy.toJSON(), {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [ [ 10, 10 ], [ 0, 0 ] ] },
            properties: { some: 'prop' },
            id: 0,
        });
    });

});
