import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { POINTER } from '../../src/core/symbols.mjs';
import { Geometry } from '../../src/geom/Geometry.mjs';
import { point } from '../../src/helpers/helpers.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('Geometry', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should destroy instance when free() method is called', () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        const geometry = point([ 1, 1 ]);
        assert.ok(geometry instanceof Geometry);
        assert.ok(!geometry.detached);
        assert.equal(destroy.mock.callCount(), 0);
        geometry.free();
        assert.ok(geometry.detached);
        assert.equal(destroy.mock.callCount(), 1);
        assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ geometry[ POINTER ] ]);
    });

    it('should automatically destroy instance when out of scope', async () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        let ptr;
        assert.equal(destroy.mock.callCount(), 0);
        void function () {
            const geometry = point([ 1, 1 ]);
            assert.ok(geometry instanceof Geometry);
            ptr = geometry[ POINTER ];
        }();
        { // to trigger FinalizationRegistry
            global.gc();
            await new Promise(resolve => setTimeout(resolve));
        }
        assert.equal(destroy.mock.callCount(), 1);
        assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ ptr ]);
    });

});
