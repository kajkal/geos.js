import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { distance } from '../../src/measurement/distance.mjs';
import { nearestPoints } from '../../src/measurement/nearestPoints.mjs';
import { lineString } from '../../src/helpers/helpers.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('distance and nearestPoints', () => {

    let a: Geometry, b: Geometry;

    function assertNearestPoints(a: Geometry, b: Geometry, expected: [ a: [ number, number ], b: [ number, number ] ]) {
        const [ aPt, bPt ] = nearestPoints(a, b);
        assert.deepEqual(aPt.toJSON().geometry.coordinates, expected[ 0 ]);
        assert.deepEqual(bPt.toJSON().geometry.coordinates, expected[ 1 ]);
    }

    before(async () => {
        await initializeForTest();
    });

    it('should return distance between two points', () => {
        a = fromWKT('POINT (0 0)');
        b = fromWKT('POINT (0 0)');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 0, 0 ] ]);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 0, 0 ] ]);

        a = fromWKT('POINT (0 0)');
        b = fromWKT('POINT (1 2)');
        assert.equal(distance(a, b), Math.sqrt(5));
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 1, 2 ] ]);

        a = fromWKT('POINT(0 0)');
        b = fromWKT('MULTIPOINT((10 0), (50 30))');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 10, 0 ] ]);

        a = fromWKT('MULTIPOINT((10 0), (50 30))');
        b = fromWKT('POINT(10 0)');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 10, 0 ], [ 10, 0 ] ]);

        a = fromWKT('MULTIPOINT((10 0), (50 30))');
        b = fromWKT('MULTIPOINT((0 0), (150 30))');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 10, 0 ], [ 0, 0 ] ]);
    });

    it('should return distance between point and line', () => {
        // point in the middle of the line
        a = fromWKT('POINT (1 1)');
        b = fromWKT('LINESTRING (0 0, 2 2)');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 1, 1 ], [ 1, 1 ] ]);

        // point on the line endpoint
        a = fromWKT('POINT (0 0)');
        b = fromWKT('LINESTRING (0 0, 2 2)');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 0, 0 ] ]);

        // the nearest point on the line is not one of its endpoints
        a = fromWKT('POINT (0 0)');
        b = fromWKT('LINESTRING (0 1, 1 0)');
        assert.equal(distance(a, b), Math.sqrt(2) / 2);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 0.5, 0.5 ] ]);

        a = fromWKT('POINT (0 0)');
        b = fromWKT('LINESTRING (-1 0, 0 1, 2 0)');
        assert.equal(distance(a, b), Math.sqrt(2) / 2);
        assertNearestPoints(a, b, [ [ 0, 0 ], [ -0.5, 0.5 ] ]);

        a = fromWKT('POINT (0 0)');
        b = fromWKT('LINESTRING (0 1, 2 0)');
        assert.equal(distance(a, b), +(2 / Math.sqrt(5)).toFixed(15));
        assertNearestPoints(a, b, [ [ 0, 0 ], [ 0.4, 0.8 ] ]);

        a = fromWKT('POINT(3 0)');
        b = fromWKT('LINESTRING(0 10, 50 10, 100 50)');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 3, 0 ], [ 3, 10 ] ]);

        a = fromWKT('POINT(3 0)');
        b = fromWKT('MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50))');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 3, 0 ], [ 3, 10 ] ]);

        a = fromWKT('MULTIPOINT((3 0), (200 30))');
        b = fromWKT('LINESTRING(0 10, 50 10, 100 50)');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 3, 0 ], [ 3, 10 ] ]);

        a = fromWKT('MULTIPOINT((3 0), (-50 30))');
        b = fromWKT('MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50))');
        assert.equal(distance(a, b), 10);
        assertNearestPoints(a, b, [ [ 3, 0 ], [ 3, 10 ] ]);
    });

    it('should return distance between line and line', () => {
        // intersecting lines
        a = fromWKT('LINESTRING (0 0, 2 2)');
        b = fromWKT('LINESTRING (0 1, 2 0)');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 2 / 3, 2 / 3 ], [ 2 / 3, 2 / 3 ] ]);

        // parallel lines
        a = fromWKT('LINESTRING (-1 -1, 3 3)');
        b = fromWKT('LINESTRING (1 0, 3 2)');
        assert.equal(distance(a, b), Math.sqrt(2) / 2);
        assertNearestPoints(a, b, [ [ 0.5, 0.5 ], [ 1, 0 ] ]);

        a = fromWKT('LINESTRING(0 0, 0 1, 1 1, 1 0, 0 0)');
        b = fromWKT('LINESTRING(2 0, 10 1, 10 10)');
        assert.equal(distance(a, b), 1);
        assertNearestPoints(a, b, [ [ 1, 0 ], [ 2, 0 ] ]);

        a = lineString([ [ 1, 5 / 3 ], [ 2, 10 / 3 ] ]);
        b = lineString([ [ 3, 5 ], [ 0, 0 ] ]);
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 2, 10 / 3 ], [ 2, 10 / 3 ] ]);

        a = fromWKT('LINESTRING (0.0 0.0, 9.9 1.4)');
        b = fromWKT('LINESTRING (11.88 1.68, 21.78 3.08)');
        assert.equal(distance(a, b), 1.9996999774966246);
        assertNearestPoints(a, b, [ [ 9.9, 1.4 ], [ 11.88, 1.68 ] ]);
    });

    it('should return distance between point and polygon', () => {
        // point outside polygon
        a = fromWKT('POINT (0 11)');
        b = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))');
        assert.equal(distance(a, b), 1);
        assertNearestPoints(a, b, [ [ 0, 11 ], [ 0, 10 ] ]);

        // point inside polygon
        a = fromWKT('POINT (1 1)');
        b = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))');
        assert.equal(distance(a, b), 0);
        assertNearestPoints(a, b, [ [ 1, 1 ], [ 1, 1 ] ]);

        // point inside polygon hole
        a = fromWKT('POINT (6 2)');
        b = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))');
        assert.equal(distance(a, b), 0.7071067811865475);
        assertNearestPoints(a, b, [ [ 6, 2 ], [ 6.5, 2.5 ] ]);

        a = fromWKT('POINT(35 60)');
        b = fromWKT('POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);

        a = fromWKT('MULTIPOINT((-100 0), (35 60))');
        b = fromWKT('POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);

        a = fromWKT('POINT(35 60)');
        b = fromWKT('GEOMETRYCOLLECTION(MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)) ), POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)), MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50)), LINESTRING(0 10, 50 10, 100 50), MULTIPOINT((10 0), (50 30)), POINT(10 0))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);

        a = fromWKT('POINT(35 60)');
        b = fromWKT('MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);

        a = fromWKT('MULTIPOINT((-100 0), (35 60))');
        b = fromWKT('MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);

        a = fromWKT('MULTIPOINT((-100 0), (35 60))');
        b = fromWKT('GEOMETRYCOLLECTION(MULTIPOLYGON(((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)),( (100 100, 150 100, 150 150, 100 150, 100 100),(120 120, 120 130, 130 130, 130 120, 120 120)) ), POLYGON((34 54, 60 34, 60 54, 34 54),(50 50, 52 50, 52 48, 50 48, 50 50)), MULTILINESTRING((34 54, 60 34),(0 10, 50 10, 100 50)), LINESTRING(0 10, 50 10, 100 50), MULTIPOINT((10 0), (50 30)), POINT(10 0))');
        assert.equal(distance(a, b), 6);
        assertNearestPoints(a, b, [ [ 35, 60 ], [ 35, 54 ] ]);
    });

    it('should return distance between two polygons', () => {
        a = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
        b = fromWKT('POLYGON((1.25 0.25, 1.25 0.75, 1.75 0.75, 1.75 0.25, 1.25 0.25))');
        assert.equal(distance(a, b), 0.25);
        assertNearestPoints(a, b, [ [ 1, 0.25 ], [ 1.25, 0.25 ] ]);

        a = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
        b = fromWKT('POLYGON((1.25 0.25, 1.25 0.75, 1.75 0.75, 1.75 0.25, 1.25 0.25))');
        assert.equal(distance(a, b), 0.25);
        assertNearestPoints(a, b, [ [ 1, 0.25 ], [ 1.25, 0.25 ] ]);

        a = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
        b = fromWKT('POLYGON((1.25 0.25, 1.25 0.75, 1.75 0.75, 1.75 0.25, 1.25 0.25))');
        assert.equal(distance(a, b), 0.25);
        assertNearestPoints(a, b, [ [ 1, 0.25 ], [ 1.25, 0.25 ] ]);
    });

    it('should return distance when one of geometries is a collection with an empty geometry', () => {
        a = fromWKT('GEOMETRYCOLLECTION (POINT EMPTY, LINESTRING (0 0, 1 1))');
        b = fromWKT('POINT (1 2)');
        assert.equal(distance(a, b), 1);
        assertNearestPoints(a, b, [ [ 1, 1 ], [ 1, 2 ] ]);

        a = fromWKT('GEOMETRYCOLLECTION(LINESTRING EMPTY, POINT(2 1))');
        b = fromWKT('POINT(1 1)');
        assert.equal(distance(a, b), 1);
        assertNearestPoints(a, b, [ [ 2, 1 ], [ 1, 1 ] ]);

        a = fromWKT('GEOMETRYCOLLECTION(POINT(-2 0), POINT EMPTY)');
        b = fromWKT('GEOMETRYCOLLECTION(POINT(1 0),LINESTRING(0 0,1 0))');
        assert.equal(distance(a, b), 2);
        assertNearestPoints(a, b, [ [ -2, 0 ], [ 0, 0 ] ]);
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

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POINT (0 0)');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('LINESTRING (0 0, 2 2)');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT (1 1)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0), (5 1, 5 4, 8 1, 5 1))');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT (0 11)');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT EMPTY');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
        b = fromWKT('POLYGON EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('POINT(35 60)');
        b = fromWKT('GEOMETRYCOLLECTION EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('MULTIPOINT((-100 0), (35 60))');
        b = fromWKT('GEOMETRYCOLLECTION EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('GEOMETRYCOLLECTION(POINT EMPTY, LINESTRING EMPTY)');
        b = fromWKT('LINESTRING EMPTY');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);

        a = fromWKT('GEOMETRYCOLLECTION(POINT EMPTY)');
        b = fromWKT('GEOMETRYCOLLECTION(POINT(1 0))');
        assert.throws(() => distance(a, b), distanceError);
        assert.throws(() => nearestPoints(a, b), nearestPointsError);
    });

    it('should throw on unsupported geometry type', () => {
        a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        b = fromWKT('LINESTRING (1 0, 2 1)');
        assert.throws(() => distance(a, b), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
