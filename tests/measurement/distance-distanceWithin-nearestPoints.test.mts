import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { distance } from '../../src/measurement/distance.mjs';
import { nearestPoints } from '../../src/measurement/nearestPoints.mjs';
import { distanceWithin } from '../../src/predicates/distanceWithin.mjs';
import { lineString } from '../../src/helpers/helpers.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('distance and distanceWithin and nearestPoints', () => {

    let a: Geometry, b: Geometry;

    function verifyResults(
        a: Geometry,
        b: Geometry,
        expectedDist: number,
        expectedPtFromA: [ number, number ],
        expectedPtFromB: [ number, number ],
        epsilon = 1e-6,
    ) {
        assert.equal(distance(a, b), expectedDist);

        assert.equal(distanceWithin(a, b, expectedDist), true);
        assert.equal(distanceWithin(a, b, expectedDist + epsilon), true);
        assert.equal(distanceWithin(a, b, expectedDist - epsilon), false);

        const [ aPt, bPt ] = nearestPoints(a, b);
        assert.deepEqual(aPt.toJSON().geometry.coordinates, expectedPtFromA);
        assert.deepEqual(bPt.toJSON().geometry.coordinates, expectedPtFromB);
    }

    before(async () => {
        await initializeForTest();
    });

    it('should return distance between two points', () => {
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('POINT (0 0)'),
            0,
            [ 0, 0 ], [ 0, 0 ],
        );
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('POINT (1 2)'),
            Math.sqrt(5),
            [ 0, 0 ], [ 1, 2 ],
        );
        verifyResults(
            fromWKT('POINT(0 0)'),
            fromWKT('MULTIPOINT((10 0), (50 30))'),
            10,
            [ 0, 0 ], [ 10, 0 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((10 0), (50 30))'),
            fromWKT('POINT(10 0)'),
            0,
            [ 10, 0 ], [ 10, 0 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((10 0), (50 30))'),
            fromWKT('MULTIPOINT((0 0), (150 30))'),
            10,
            [ 10, 0 ], [ 0, 0 ],
        );
    });

    it('should return distance between point and line', () => {
        // point in the middle of the line
        verifyResults(
            fromWKT('POINT (1 1)'),
            fromWKT('LINESTRING (0 0, 2 2)'),
            0,
            [ 1, 1 ], [ 1, 1 ],
        );

        // point on the line endpoint
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('LINESTRING (0 0, 2 2)'),
            0,
            [ 0, 0 ], [ 0, 0 ],
        );

        // the nearest point on the line is not one of its endpoints
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('LINESTRING (0 1, 1 0)'),
            Math.sqrt(2) / 2,
            [ 0, 0 ], [ 0.5, 0.5 ],
        );

        // point not on the line
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('LINESTRING (-1 0, 0 1, 2 0)'),
            Math.sqrt(2) / 2,
            [ 0, 0 ], [ -0.5, 0.5 ],
        );
        verifyResults(
            fromWKT('POINT (0 0)'),
            fromWKT('LINESTRING (0 1, 2 0)'),
            +(2 / Math.sqrt(5)).toFixed(15),
            [ 0, 0 ], [ 0.4, 0.8 ],
        );
        verifyResults(
            fromWKT('POINT(3 0)'),
            fromWKT('LINESTRING(0 10, 50 10, 100 50)'),
            10,
            [ 3, 0 ], [ 3, 10 ],
        );
        verifyResults(
            fromWKT('POINT(3 0)'),
            fromWKT('MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50))'),
            10,
            [ 3, 0 ], [ 3, 10 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((3 0), (200 30))'),
            fromWKT('LINESTRING(0 10, 50 10, 100 50)'),
            10,
            [ 3, 0 ], [ 3, 10 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((3 0), (-50 30))'),
            fromWKT('MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50))'),
            10,
            [ 3, 0 ], [ 3, 10 ],
        );
    });

    it('should return distance between line and line', () => {
        // intersecting lines
        verifyResults(
            fromWKT('LINESTRING (0 0, 2 2)'),
            fromWKT('LINESTRING (0 1, 2 0)'),
            0,
            [ 2 / 3, 2 / 3 ], [ 2 / 3, 2 / 3 ],
        );

        // parallel lines
        verifyResults(
            fromWKT('LINESTRING (-1 -1, 3 3)'),
            fromWKT('LINESTRING (1 0, 3 2)'),
            Math.sqrt(2) / 2,
            [ 0.5, 0.5 ], [ 1, 0 ],
        );

        // overlapping lines
        verifyResults(
            lineString([ [ 1, 5 / 3 ], [ 2, 10 / 3 ] ]),
            lineString([ [ 3, 5 ], [ 0, 0 ] ]),
            0,
            [ 2, 10 / 3 ], [ 2, 10 / 3 ],
        );

        // disjoint lines
        verifyResults(
            fromWKT('LINESTRING(0 0, 0 1, 1 1, 1 0, 0 0)'),
            fromWKT('LINESTRING(2 0, 10 1, 10 10)'),
            1,
            [ 1, 0 ], [ 2, 0 ],
        );
        verifyResults(
            fromWKT('LINESTRING (0.0 0.0, 9.9 1.4)'),
            fromWKT('LINESTRING (11.88 1.68, 21.78 3.08)'),
            1.9996999774966246,
            [ 9.9, 1.4 ], [ 11.88, 1.68 ],
        );
    });

    it('should return distance between point and polygon', () => {
        // point inside polygon
        verifyResults(
            fromWKT('POINT (1 1)'),
            fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))'),
            0,
            [ 1, 1 ], [ 1, 1 ],
        );

        // point inside polygon hole
        verifyResults(
            fromWKT('POINT (6 2)'),
            fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))'),
            0.7071067811865475,
            [ 6, 2 ], [ 6.5, 2.5 ],
        );

        // point outside polygon
        verifyResults(
            fromWKT('POINT (0 11)'),
            fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))'),
            1,
            [ 0, 11 ], [ 0, 10 ],
        );
        verifyResults(
            fromWKT('POINT(35 60)'),
            fromWKT('POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((-100 0), (35 60))'),
            fromWKT('POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
        verifyResults(
            fromWKT('POINT(35 60)'),
            fromWKT('GEOMETRYCOLLECTION(MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)) ), POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)), MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50)), LINESTRING(0 10, 50 10, 100 50), MULTIPOINT((10 0), (50 30)), POINT(10 0))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
        verifyResults(
            fromWKT('POINT(35 60)'),
            fromWKT('MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((-100 0), (35 60))'),
            fromWKT('MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
        verifyResults(
            fromWKT('MULTIPOINT((-100 0), (35 60))'),
            fromWKT('GEOMETRYCOLLECTION(MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)) ), POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)), MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50)), LINESTRING(0 10, 50 10, 100 50), MULTIPOINT((10 0), (50 30)), POINT(10 0))'),
            6,
            [ 35, 60 ], [ 35, 54 ],
        );
    });

    it('should return distance between two polygons', () => {
        // polygon inside polygon
        verifyResults(
            fromWKT('POLYGON((2 2, 2 4, 4 4, 4 2, 2 2))'),
            fromWKT('POLYGON((0 0, 0 10, 10 10, 10 0, 0 0))'),
            0,
            [ 2, 2 ], [ 2, 2 ],
        );

        // overlapping polygons
        verifyResults(
            fromWKT('POLYGON((2 2, 2 14, 14 14, 14 2, 2 2))'),
            fromWKT('POLYGON((0 0, 0 10, 10 10, 10 0, 0 0))'),
            0,
            [ 2, 2 ], [ 2, 2 ],
        );

        // disjoint polygons
        verifyResults(
            fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'),
            fromWKT('POLYGON((1.25 0.25, 1.25 0.75, 1.75 0.75, 1.75 0.25, 1.25 0.25))'),
            0.25,
            [ 1, 0.25 ], [ 1.25, 0.25 ],
        );
    });

    it('should return distance when one of geometries is a collection with an empty geometry', () => {
        verifyResults(
            fromWKT('GEOMETRYCOLLECTION (POINT EMPTY, LINESTRING (0 0, 1 1))'),
            fromWKT('POINT (1 2)'),
            1,
            [ 1, 1 ], [ 1, 2 ],
        );
        verifyResults(
            fromWKT('GEOMETRYCOLLECTION(LINESTRING EMPTY, POINT(2 1))'),
            fromWKT('POINT(1 1)'),
            1,
            [ 2, 1 ], [ 1, 1 ],
        );
        verifyResults(
            fromWKT('GEOMETRYCOLLECTION(POINT(-2 0), POINT EMPTY)'),
            fromWKT('GEOMETRYCOLLECTION(POINT(1 0),LINESTRING(0 0,1 0))'),
            2,
            [ -2, 0 ], [ 0, 0 ],
        );
    });

    it('should throw when either geometry is empty', () => {
        const distanceError = {
            name: 'GEOSError',
            message: '"distance" called with empty inputs',
        };
        const nearestPointsError = {
            name: 'GEOSError',
            message: '"nearestPoints" called with empty inputs',
        };

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POINT EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POINT (0 0)');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('LINESTRING (0 0, 2 2)');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT (1 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT (0 11)');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('POINT(35 60)');
        b = fromWKT('GEOMETRYCOLLECTION EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('MULTIPOINT((-100 0), (35 60))');
        b = fromWKT('GEOMETRYCOLLECTION EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('GEOMETRYCOLLECTION(POINT EMPTY, LINESTRING EMPTY)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);

        a = fromWKT('GEOMETRYCOLLECTION(POINT EMPTY)');
        b = fromWKT('GEOMETRYCOLLECTION(POINT(1 0))');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
        assert.equal(distanceWithin(a, b, 0), false);
        assert.equal(distanceWithin(a, b, Infinity), false);
    });

    it('should throw on unsupported geometry type', () => {
        a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => distance(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
        assert.throws(() => distanceWithin(a, b, 1), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
        assert.throws(() => nearestPoints(a, b), {
            name: 'GEOSError',
            message: 'Curved geometry types are not supported.',
        });
    });

});
