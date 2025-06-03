import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { hausdorffDistance } from '../../src/measurement/hausdorffDistance.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('hausdorffDistance', () => {

    let a: Geometry, b: Geometry, c: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should return Hausdorff distance between two geometries', () => {
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING (0 0, 2 0)');
        assert.equal(hausdorffDistance(a, b), 1);

        // zero densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => hausdorffDistance(a, b, { densify: 0 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        // too big densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => hausdorffDistance(a, b, { densify: 1 + 1e-10 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        // too small positive densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => hausdorffDistance(a, b, { densify: 1e-30 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        a = fromWKT('LINESTRING (0 0, 2 0)');
        b = fromWKT('LINESTRING (0 1, 1 2, 2 1)');
        assert.equal(hausdorffDistance(a, b), 2);

        a = fromWKT('LINESTRING (0 0, 2 0)');
        b = fromWKT('MULTIPOINT ((0 1), (1 0), (2 1))');
        assert.equal(hausdorffDistance(a, b), 1);

        a = fromWKT('LINESTRING (130 0, 0 0, 0 150)');
        b = fromWKT('LINESTRING (10 10, 10 150, 130 10)');
        assert.equal(hausdorffDistance(a, b), 14.142135623730951);

        a = fromWKT('LINESTRING (130 0, 0 0, 0 150)');
        b = fromWKT('LINESTRING (10 10, 10 150, 130 10)');
        assert.equal(hausdorffDistance(a, b, { densify: 0.5 }), 70);

        a = fromWKT('LINESTRING (0 0, 100 0, 10 100, 10 100)');
        b = fromWKT('LINESTRING (0 100, 0 10, 80 10)');
        assert.equal(hausdorffDistance(a, b, { densify: 0.001 }), 47.89);

        a = fromWKT('GEOMETRYCOLLECTION (POINT EMPTY, LINESTRING (0 0, 1 1))');
        b = fromWKT('POINT (1 2)');
        c = fromWKT('LINESTRING (0 0, 1 1)');
        assert.equal(hausdorffDistance(a, b), hausdorffDistance(b, c));

        a = fromWKT('LINEARRING (0 0, 0 10, 10 10, 10 0, 0 0)');
        b = fromWKT('LINEARRING (1 1, 1 9, 8 8, 9 1, 1 1)');
        assert.equal(hausdorffDistance(a, b), 2.8284271247461903);
    });

    it('should throw when either geometry is empty', () => {
        a = fromWKT('POINT (1 1)');
        b = fromWKT('POINT EMPTY');
        assert.throws(() => hausdorffDistance(a, b), {
            name: 'GEOSError',
            message: '"hausdorffDistance" called with empty inputs',
        });
        assert.throws(() => hausdorffDistance(b, a), {
            name: 'GEOSError',
            message: '"hausdorffDistance" called with empty inputs',
        });
        assert.throws(() => hausdorffDistance(b, b), {
            name: 'GEOSError',
            message: '"hausdorffDistance" called with empty inputs',
        });
    });

    it('should throw on unsupported geometry type', () => {
        a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => hausdorffDistance(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
        assert.throws(() => hausdorffDistance(b, a), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
