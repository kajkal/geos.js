import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { GEOSGeometry, Ptr } from '../../src/core/types/WasmGEOS.mjs';
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
            global.gc!();
            await new Promise(resolve => setTimeout(resolve));
        }
        assert.equal(destroy.mock.callCount(), 1);
        assert.deepEqual(destroy.mock.calls[ 0 ].arguments, [ ptr ]);
    });

    it('should set geometry type on construction', () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        const typeId = mock.method(geos, 'GEOSGeomTypeId');
        destroy.mock.mockImplementation(_ => undefined);
        typeId.mock.mockImplementation(_ => 0); // mocked 'Point'

        // use provided type when type is known at the construction time
        const a = new Geometry(1001 as Ptr<GEOSGeometry>, 'Polygon');
        assert.equal(a.type, 'Polygon');
        assert.equal(typeId.mock.callCount(), 0);

        // call GEOSGeomTypeId when type is unknown
        const b = new Geometry(1002 as Ptr<GEOSGeometry>);
        assert.equal(b.type, 'Point');
        assert.equal(typeId.mock.callCount(), 1);
        assert.deepEqual(typeId.mock.calls[ 0 ].arguments, [ 1002 ]);
    });

    it('should set geometry extra attributes', () => {
        const destroy = mock.method(geos, 'GEOSGeom_destroy');
        destroy.mock.mockImplementation(_ => undefined);

        let g = new Geometry(1001 as Ptr<GEOSGeometry>, 'Point');
        assert.equal(g.id, undefined);
        assert.equal(g.props, undefined);

        g = new Geometry(1001 as Ptr<GEOSGeometry>, 'Point', {});
        assert.equal(g.id, undefined);
        assert.equal(g.props, undefined);

        g = new Geometry(1001 as Ptr<GEOSGeometry>, 'Point', { id: 1 });
        assert.equal(g.id, 1);
        assert.equal(g.props, undefined);

        g = new Geometry(1001 as Ptr<GEOSGeometry>, 'Point', { properties: { some: 'prop' } });
        assert.equal(g.id, undefined);
        assert.deepEqual(g.props, { some: 'prop' });

        g = new Geometry(1001 as Ptr<GEOSGeometry>, 'Point', { id: 1, properties: { some: 'prop' } });
        assert.equal(g.id, 1);
        assert.deepEqual(g.props, { some: 'prop' });
    });

});
