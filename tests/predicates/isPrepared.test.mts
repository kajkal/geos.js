import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { isPrepared } from '../../src/predicates/isPrepared.mjs';
import { prepare, type Prepared, unprepare } from '../../src/geom/PreparedGeometry.mjs';
import { point } from '../../src/helpers/helpers.mjs';


describe('isPrepared', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return whether geometry is prepared', () => {
        const p = point([ 1, 1 ]);
        assert.equal(isPrepared(p), false);
        prepare(p);
        assert.equal(isPrepared(p), true);
        unprepare(p as Prepared<any>);
        assert.equal(isPrepared(p), false);
    });

});
