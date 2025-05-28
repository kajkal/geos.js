import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { lineString, multiPoint, multiPolygon, point, polygon } from '../../src/helpers/helpers.mjs';
import { isValid, isValidOrThrow } from '../../src/predicates/isValid.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('isValid and isValidOrThrow', () => {

    let a: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should return whether geometry is valid', () => {
        a = point([ 0, 0 ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = multiPoint([ [ 0, 0 ], [ 0, 0 ] ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = polygon([ // polygon with hole
            [ [ 1, 9 ], [ 9, 9 ], [ 9, 1 ], [ 1, 1 ], [ 1, 9 ] ],
            [ [ 6, 2 ], [ 2, 7 ], [ 9, 9 ], [ 6, 2 ] ],
        ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = multiPolygon([ // multipolygon touch at vertices
            [ [ [ 1, 1 ], [ 1, 9 ], [ 9, 9 ], [ 9, 1 ], [ 8, 8 ], [ 5, 2 ], [ 2, 8 ], [ 1, 1 ] ] ],
            [ [ [ 9, 1 ], [ 1, 1 ], [ 5, 2 ], [ 9, 1 ] ] ],
        ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = multiPolygon([ // multipolygon touch at vertices segments
            [ [ [ 6, 4 ], [ 9, 1 ], [ 9, 9 ], [ 1, 9 ], [ 1, 1 ], [ 4, 4 ], [ 6, 4 ] ] ],
            [ [ [ 5, 4 ], [ 2, 2 ], [ 8, 2 ], [ 5, 4 ] ] ],
        ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = multiPolygon([ // multipolygon hole touch vertices
            [
                [ [ 2, 38 ], [ 42, 38 ], [ 42, 2 ], [ 2, 2 ], [ 2, 38 ] ],
                [ [ 22, 34 ], [ 8, 32 ], [ 6, 20 ], [ 14, 10 ], [ 34, 6 ], [ 30, 24 ], [ 22, 34 ] ],
            ],
            [ [ [ 6, 20 ], [ 34, 6 ], [ 22, 34 ], [ 6, 20 ] ] ],
        ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = polygon([ // polygon multiple holes touch at the same point
            [ [ 1, 9 ], [ 9, 9 ], [ 9, 1 ], [ 1, 1 ], [ 1, 9 ] ],
            [ [ 4, 8 ], [ 6, 8 ], [ 5, 5 ], [ 4, 8 ] ],
            [ [ 2, 6 ], [ 2, 4 ], [ 5, 5 ], [ 2, 6 ] ],
            [ [ 4, 2 ], [ 6, 2 ], [ 5, 5 ], [ 4, 2 ] ],
        ]);
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = lineString([ [ 0, 0 ], [ 1, NaN ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Invalid Coordinate',
            location: [ 1, NaN ],
        });

        a = lineString([ [ 0, 0 ], [ 1, Infinity ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Invalid Coordinate',
            location: [ 1, Infinity ],
        });

        a = lineString([ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Too few points in geometry component',
            location: [ 0, 0 ],
        });

        a = polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 0, 0 ] ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Too few points in geometry component',
            location: [ 0, 0 ],
        });

        a = polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ], [ [ 0.5, 0.5 ], [ 2, 1 ], [ 2, 0.5 ], [ 0.5, 0.5 ] ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Hole lies outside shell',
            location: [ 0.5, 0.5 ],
        });

        a = polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 0, 1 ], [ 0, 0 ] ] ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Self-intersection',
            location: [ 0.5, 0.5 ],
        });

        // self-touching exterior ring forming a hole
        a = polygon([ [ [ 7, 25 ], [ 4, 50 ], [ 10, 40 ], [ 7, 25 ], [ 8, 35 ], [ 6, 35 ], [ 7, 25 ] ] ]);
        assert.equal(isValid(a, { isInvertedRingValid: true }), true);
        assert.doesNotThrow(() => isValidOrThrow(a, { isInvertedRingValid: true }));
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Ring Self-intersection',
            location: [ 7, 25 ],
        });
        a = polygon([ [ [ 0, 0 ], [ 0, 10 ], [ 10, 0 ], [ 0, 0 ], [ 4, 2 ], [ 2, 4 ], [ 0, 0 ] ] ]);
        assert.equal(isValid(a, { isInvertedRingValid: true }), true);
        assert.doesNotThrow(() => isValidOrThrow(a, { isInvertedRingValid: true }));
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Ring Self-intersection',
            location: [ 0, 0 ],
        });

        a = polygon([
            [ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ],
            [ [ 5, 0 ], [ 4, 5 ], [ 5, 10 ], [ 6, 5 ], [ 5, 0 ] ],
        ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Interior is disconnected',
            location: [ 5, 10 ],
        });

        a = polygon([
            [ [ 1, 9 ], [ 9, 9 ], [ 9, 1 ], [ 1, 1 ], [ 1, 9 ] ],
            [ [ 2, 8 ], [ 3, 8 ], [ 2, 2 ], [ 2, 8 ] ],
            [ [ 8, 3 ], [ 2, 2 ], [ 8, 2 ], [ 8, 3 ] ],
            [ [ 8, 8 ], [ 3, 8 ], [ 8, 3 ], [ 8, 8 ] ],
        ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Interior is disconnected',
            location: [ 8, 3 ],
        });

        a = multiPolygon([ [
            [ [ 1, 1 ], [ 2, 3 ], [ 1, 9 ], [ 9, 9 ], [ 8, 3 ], [ 9, 1 ], [ 5, 2 ], [ 1, 1 ] ] ],
            [ [ [ 8, 3 ], [ 2, 3 ], [ 5, 2 ], [ 8, 3 ] ] ],
        ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Nested shells',
            location: [ 8, 3 ],
        });

        a = polygon([
            [ [ 1, 9 ], [ 9, 9 ], [ 9, 1 ], [ 1, 1 ], [ 1, 9 ] ],
            [ [ 2, 8 ], [ 8, 8 ], [ 8, 2 ], [ 2, 2 ], [ 2, 8 ] ],
            [ [ 5, 8 ], [ 8, 5 ], [ 5, 2 ], [ 2, 5 ], [ 5, 8 ] ],
        ]);
        assert.equal(isValid(a), false);
        assert.throws(() => isValidOrThrow(a), {
            name: 'TopologyValidationError',
            message: 'Holes are nested',
            location: [ 5, 8 ],
        });
    });

    it('should return true for empty geometry', () => {
        a = fromWKT('POINT EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('LINESTRING EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('POLYGON EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('MULTIPOINT EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('MULTILINESTRING EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('MULTIPOLYGON EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));

        a = fromWKT('GEOMETRYCOLLECTION EMPTY');
        assert.equal(isValid(a), true);
        assert.doesNotThrow(() => isValidOrThrow(a));
    });

    it('should throw on unsupported geometry type', () => {
        assert.throws(() => isValid(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved types not supported in IsValidOp.',
        });
    });

});
