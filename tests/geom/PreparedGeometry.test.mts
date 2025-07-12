import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { P_POINTER, POINTER } from '../../src/core/symbols.mjs';
import { GeometryRef } from '../../src/geom/Geometry.mjs';
import { prepare, unprepare } from '../../src/geom/PreparedGeometry.mjs';
import { point } from '../../src/helpers/helpers.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('PreparedGeometry', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should destroy instance when free() method is called', () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        const preparedDestroy = mock.method(geos, 'GEOSPreparedGeom_destroy');

        const preparedGeom = prepare(point([ 1, 1 ]));
        assert.ok(preparedGeom instanceof GeometryRef);
        assert.ok(!preparedGeom.detached);
        assert.equal(destroy.mock.callCount(), 0);
        assert.equal(preparedDestroy.mock.callCount(), 0);
        preparedGeom.free();
        assert.ok(preparedGeom.detached);
        assert.equal(destroy.mock.callCount(), 1);
        assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ preparedGeom[ POINTER ] ]);
        assert.equal(preparedDestroy.mock.callCount(), 1);
        assert.deepEqual(preparedDestroy.mock.calls[ 0 ].arguments, [ preparedGeom[ P_POINTER ] ]);
    });

    it('should automatically destroy instance when out of scope', async () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        const preparedDestroy = mock.method(geos, 'GEOSPreparedGeom_destroy');

        let ptr, p_ptr;
        void function () {
            const geometry = prepare(point([ 1, 1 ]));
            assert.ok(geometry instanceof GeometryRef);
            ptr = geometry[ POINTER ];
            p_ptr = geometry[ P_POINTER ];
        }();
        { // to trigger FinalizationRegistry
            global.gc!();
            await new Promise(resolve => setTimeout(resolve));
        }
        assert.equal(destroy.mock.callCount(), 1);
        assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ ptr ]);
        assert.equal(preparedDestroy.mock.callCount(), 1);
        assert.deepEqual(preparedDestroy.mock.calls[ 0 ].arguments, [ p_ptr ]);
    });

    it('should prepare unprepared geometry', () => {
        const geosPrepare = mock.method(geos, 'GEOSPrepare');

        const geom = point([ 1, 1 ]);
        assert.equal(geosPrepare.mock.callCount(), 0);
        const prepared = prepare(geom);
        assert.equal(prepared, geom); // the same object
        assert.equal(geosPrepare.mock.callCount(), 1);

        // should not prepare already prepared geometry
        const prepared2 = prepare(geom);
        assert.equal(prepared2, geom); // the same object
        assert.equal(geosPrepare.mock.callCount(), 1); // no changes
    });

    it('should unprepare prepared geometry', () => {
        const geosPreparedDestroy = mock.method(geos, 'GEOSPreparedGeom_destroy');

        const geom = point([ 1, 1 ]);

        // should not unprepare not prepared geometry
        const unprepared = unprepare(geom as any);
        assert.equal(unprepared, geom); // the same object
        assert.equal(geosPreparedDestroy.mock.callCount(), 0);

        const prepared = prepare(geom);
        assert.equal(prepared, geom); // the same object

        // should unprepare prepared geometry
        const unprepared2 = unprepare(prepared);
        assert.equal(unprepared2, geom); // the same object
        assert.equal(geosPreparedDestroy.mock.callCount(), 1);
    });

    it('should throw on unsupported geometry type', () => {
        const geom = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        assert.throws(() => prepare(geom), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
