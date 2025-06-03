import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { frechetDistance } from '../../src/measurement/frechetDistance.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('frechetDistance', () => {

    let a: Geometry, b: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should return Hausdorff distance between two geometries', () => {
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING (0 0, 2 0)');
        assert.equal(frechetDistance(a, b), 1);

        // zero densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => frechetDistance(a, b, { densify: 0 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        // too big densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => frechetDistance(a, b, { densify: 1 + 1e-10 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        // too small positive densify factor
        a = fromWKT('LINESTRING (0 0, 2 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => frechetDistance(a, b, { densify: 1e-30 }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Fraction is not in range (0.0 - 1.0]',
        });

        a = fromWKT('LINESTRING (0 0, 2 0)');
        b = fromWKT('LINESTRING (0 1, 1 2, 2 1)');
        assert.equal(frechetDistance(a, b), 2.23606797749979);

        a = fromWKT('LINESTRING (0 0, 2 0)');
        b = fromWKT('MULTIPOINT ((0 1), (1 0), (2 1))');
        assert.equal(frechetDistance(a, b), 1);

        a = fromWKT('LINESTRING (0 0, 100 0)');
        b = fromWKT('LINESTRING (0 0, 50 50, 100 0)');
        assert.equal(frechetDistance(a, b), 70.71067811865476);

        a = fromWKT('LINESTRING (0 0, 100 0)');
        b = fromWKT('LINESTRING (0 0, 50 50, 100 0)');
        assert.equal(frechetDistance(a, b, { densify: 0.5 }), 50.0);

        a = fromWKT('LINESTRING (1 1, 2 2)');
        b = fromWKT('LINESTRING (1 4, 2 3)');
        assert.equal(frechetDistance(a, b), 3);
    });

    it('should throw when either geometry is empty', () => {
        a = fromWKT('POINT (1 1)');
        b = fromWKT('POINT EMPTY');
        assert.throws(() => frechetDistance(b, a), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'DiscreteFrechetDistance called with empty inputs.',
        });
    });

    it('should throw on unsupported geometry type', () => {
        a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => frechetDistance(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
        assert.throws(() => frechetDistance(b, a), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
