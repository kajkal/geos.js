import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { version } from '../../src/other/version.mjs';


describe('version', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return GEOS version', () => {
        assert.equal(version(), '3.13.1-CAPI-1.19.2');
    });

});
