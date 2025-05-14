import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('WKT', () => {

    before(async () => {
        await initializeForTest();
    });

    describe('from', () => {

        it('should reuse existing WKTReader instance', () => {
            const create = mock.method(geos, 'GEOSWKTReader_create');

            const wkt1 = 'POINT (1 1)';
            const wkt2 = 'POINT (2 2)';

            fromWKT(wkt1);
            fromWKT(wkt2);
            assert.equal(create.mock.callCount(), 1);

            fromWKT(wkt1, { fix: false });
            fromWKT(wkt2, { fix: false });
            assert.equal(create.mock.callCount(), 2);

            fromWKT(wkt1, { fix: true });
            fromWKT(wkt2, { fix: true });
            assert.equal(create.mock.callCount(), 3);

            assert.deepEqual(geos.t_r, {
                null: create.mock.calls[ 0 ].result,
                'false': create.mock.calls[ 1 ].result,
                'true': create.mock.calls[ 2 ].result,
            });
        });

        it('should handle `fix` option', () => {
            const input = 'POLYGON ((0 0, 1 0, 1 1))';
            assert.throws(() => fromWKT(input, { fix: false }), {
                name: 'GeosError::IllegalArgumentException',
                message: 'Points of LinearRing do not form a closed linestring',
            });
            assert.throws(() => fromWKT(input), { // default
                name: 'GeosError::IllegalArgumentException',
                message: 'Points of LinearRing do not form a closed linestring',
            });
            assert.deepEqual(fromWKT(input, { fix: true }).toJSON(), {
                type: 'Polygon',
                coordinates: [ [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 0 ] ] ],
            });
        });

    });

    describe('to', () => {

        it('should reuse existing WKTWriter instance', () => {
            const create = mock.method(geos, 'GEOSWKTWriter_create');

            const pt1 = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            const pt2 = fromWKT('POINT Z (1.987654321 1.123456789 30)');

            toWKT(pt1);
            toWKT(pt2);
            assert.equal(create.mock.callCount(), 1);

            toWKT(pt1, { dim: 2 });
            toWKT(pt2, { dim: 2 });
            assert.equal(create.mock.callCount(), 2);

            toWKT(pt1, { dim: 2, precision: 8 });
            toWKT(pt2, { dim: 2, precision: 8 });
            assert.equal(create.mock.callCount(), 3);

            toWKT(pt1, { dim: 3, precision: 6 });
            toWKT(pt2, { dim: 3, precision: 6 });
            assert.equal(create.mock.callCount(), 4);

            assert.deepEqual(geos.t_w, {
                null: create.mock.calls[ 0 ].result,
                '2,,': create.mock.calls[ 1 ].result,
                '2,8,': create.mock.calls[ 2 ].result,
                '3,6,': create.mock.calls[ 3 ].result,
            });
        });

        it('should handle `dim` option', () => {
            const pt = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            assert.equal(toWKT(pt, { dim: 2 }), 'POINT (-0.123456789 3.987654321)');
            assert.equal(toWKT(pt, { dim: 3 }), 'POINT Z (-0.123456789 3.987654321 10)');
            assert.equal(toWKT(pt, { dim: 4 }), 'POINT ZM (-0.123456789 3.987654321 10 4)');
            assert.equal(toWKT(pt, { dim: 4 }), toWKT(pt)); // default
        });

        it('should handle `precision` option', () => {
            const pt = fromWKT('POINT (-0.123456789 3.987654321)');
            assert.equal(toWKT(pt, { precision: 4 }), 'POINT (-0.1235 3.9877)');
            assert.equal(toWKT(pt, { precision: 16 }), 'POINT (-0.123456789 3.987654321)');
            assert.equal(toWKT(pt, { precision: 16 }), toWKT(pt)); // default
        });

        it('should handle `trim` option', () => {
            const pt = fromWKT('POINT (-0.123456789 3.987654321)');
            assert.equal(toWKT(pt, { trim: false }), 'POINT (-0.1234567890000000 3.9876543209999999)');
            assert.equal(toWKT(pt, { trim: true }), 'POINT (-0.123456789 3.987654321)');
            assert.equal(toWKT(pt, { trim: true }), toWKT(pt)); // default
        });

    });

});
