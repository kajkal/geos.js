import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry, GeometryRef } from '../../src/geom/Geometry.mjs';
import { box, circularString, compoundCurve, curvePolygon, geometryCollection, lineString, multiCurve, multiLineString, multiPoint, multiPolygon, multiSurface, point, polygon } from '../../src/helpers/helpers.mjs';
import { isEmpty } from '../../src/predicates/isEmpty.mjs';
import { toWKT } from '../../src/io/WKT.mjs';


describe('miscellaneous helpers', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should create simple geometries', () => {
        let g: Geometry = point([ 1, 1 ]);
        assert.equal(toWKT(g), 'POINT (1 1)');

        g = lineString([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ]);
        assert.equal(toWKT(g), 'LINESTRING (0 0, 1 1, 2 2)');

        g = polygon([ [ [ 0, 0 ], [ 0, 2 ], [ 2, 2 ], [ 2, 0 ], [ 0, 0 ] ] ]);
        assert.equal(toWKT(g), 'POLYGON ((0 0, 0 2, 2 2, 2 0, 0 0))');
    });

    it('should assign id to new geometry', () => {
        const options = { id: 0 };
        let g: GeometryRef = point([], options);
        assert.equal(g.id, 0);

        g = lineString([], options);
        assert.equal(g.id, 0);

        g = polygon([], options);
        assert.equal(g.id, 0);

        g = multiPoint([], options);
        assert.equal(g.id, 0);

        g = multiLineString([], options);
        assert.equal(g.id, 0);

        g = multiPolygon([], options);
        assert.equal(g.id, 0);

        g = geometryCollection([], options);
        assert.equal(g.id, 0);

        g = box([ 0, 0, 1, 1 ], options);
        assert.equal(g.id, 0);
    });

    it('should assign props to new geometry', () => {
        const options = { properties: { some: 'prop' } };
        let g: GeometryRef = point([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = lineString([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = polygon([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiPoint([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiLineString([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = multiPolygon([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = geometryCollection([], options);
        assert.deepEqual(g.props, { some: 'prop' });

        g = box([ 0, 0, 1, 1 ], options);
        assert.deepEqual(g.props, { some: 'prop' });
    });

    describe('multiPoint', () => {

        it('should create MultiPoint from coordinates', () => {
            const g = multiPoint([ [ 1, 1 ], [ 2, 2 ], [ 3, 3 ] ]);
            assert.equal(toWKT(g), 'MULTIPOINT ((1 1), (2 2), (3 3))');
        });

        it('should create MultiPoint from Point geometries', () => {
            const g1 = point([ 1, 1 ]);
            const g2 = point([ 2, 2 ]);
            let g = multiPoint([ g1, g2 ]);
            assert.equal(toWKT(g), 'MULTIPOINT ((1 1), (2 2))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);

            g = multiPoint([ g1, g2 ], { consume: true });
            assert.equal(toWKT(g), 'MULTIPOINT ((1 1), (2 2))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);

            g = multiPoint([]);
            assert.equal(toWKT(g), 'MULTIPOINT EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const g1 = point([ 1, 1 ]);
            const g2 = lineString([ [ 2, 2 ], [ 3, 3 ] ]);
            assert.throws(() => multiPoint([ g1, g2 as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be Point. LineString is not allowed',
            });
        });

    });

    describe('multiLineString', () => {

        it('should create MultiLineString string from coordinates', () => {
            const g = multiLineString([ [ [ 0, 0 ], [ 1, 1 ] ], [ [ 2, 2 ], [ 3, 3 ] ] ]);
            assert.equal(toWKT(g), 'MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');
        });

        it('should create MultiLineString from LineString geometries', () => {
            const g1 = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
            const g2 = lineString([ [ 2, 2 ], [ 3, 3 ] ]);
            let g = multiLineString([ g1, g2 ]);
            assert.equal(toWKT(g), 'MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);

            g = multiLineString([ g1, g2 ], { consume: true });
            assert.equal(toWKT(g), 'MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);

            g = multiLineString([]);
            assert.equal(toWKT(g), 'MULTILINESTRING EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const g1 = lineString([ [ 0, 0 ], [ 1, 1 ] ]);
            const g2 = point([ 1, 1 ]);
            assert.throws(() => multiLineString([ g1, g2 as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be LineString. Point is not allowed',
            });
        });

    });

    describe('multiPolygon', () => {

        it('should create MultiPolygon from coordinates', () => {
            const g = multiPolygon([
                [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ],
                [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 3, 2 ], [ 2, 2 ] ] ],
            ]);
            assert.equal(toWKT(g), 'MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)), ((2 2, 2 3, 3 3, 3 2, 2 2)))');
        });

        it('should create MultiPolygon from Polygon geometries', () => {
            const g1 = polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
            const g2 = polygon([ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 3, 2 ], [ 2, 2 ] ] ]);
            let g = multiPolygon([ g1, g2 ]);
            assert.equal(toWKT(g), 'MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)), ((2 2, 2 3, 3 3, 3 2, 2 2)))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);

            g = multiPolygon([ g1, g2 ], { consume: true });
            assert.equal(toWKT(g), 'MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)), ((2 2, 2 3, 3 3, 3 2, 2 2)))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);

            g = multiPolygon([]);
            assert.equal(toWKT(g), 'MULTIPOLYGON EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const g1 = polygon([ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ]);
            const g2 = multiPolygon([]);
            assert.throws(() => multiPolygon([ g1, g2 as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be Polygon. MultiPolygon is not allowed',
            });
        });

    });

    describe('geometryCollection', () => {

        it('should create GeometryCollection from array of geometries', () => {
            const g1 = point([ 1, 1 ]);
            const g2 = lineString([ [ 0, 0 ], [ 2, 2 ] ]);
            const g3 = lineString([ [ 2, 8 ], [ 10, 8 ] ]);

            let g = geometryCollection([ g1, g2, g3 ]);
            assert.equal(toWKT(g), 'GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 2 2), LINESTRING (2 8, 10 8))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);
            assert.ok(!g3.detached);

            g = geometryCollection([ g1, g2, g3 ], { consume: true });
            assert.equal(toWKT(g), 'GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 2 2), LINESTRING (2 8, 10 8))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);
            assert.ok(g3.detached);

            // should create empty geometry collection
            const emptyCollection = geometryCollection([]);
            assert.ok(isEmpty(emptyCollection));
            assert.equal(toWKT(emptyCollection), 'GEOMETRYCOLLECTION EMPTY');
        });

    });

    describe('circularString', () => {

        it('should create CircularString from coordinates', () => {
            // single arc
            const g1 = circularString([ [ 0, 4 ], [ 2, 8 ], [ 8, 4 ] ]);
            assert.equal(toWKT(g1), 'CIRCULARSTRING (0 4, 2 8, 8 4)');
            // two arcs
            const g2 = circularString([ [ 0, 4 ], [ 2, 8 ], [ 8, 4 ], [ 10, 0 ], [ 16, 4 ] ]);
            assert.equal(toWKT(g2), 'CIRCULARSTRING (0 4, 2 8, 8 4, 10 0, 16 4)');
        });

    });

    describe('compoundCurve', () => {

        it('should create CompoundCurve from LineString and CircularString geometries', () => {
            const g1 = lineString([ [ 0, 10 ], [ 0, 0 ], [ 5, 0 ], [ 5, 5 ] ]);
            const g2 = circularString([ [ 5, 5 ], [ 10, 10 ], [ 10, 0 ] ]);
            let g = compoundCurve([ g1, g2 ]);
            assert.equal(toWKT(g), 'COMPOUNDCURVE ((0 10, 0 0, 5 0, 5 5), CIRCULARSTRING (5 5, 10 10, 10 0))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);

            g = compoundCurve([ g1, g2 ], { consume: true });
            assert.equal(toWKT(g), 'COMPOUNDCURVE ((0 10, 0 0, 5 0, 5 5), CIRCULARSTRING (5 5, 10 10, 10 0))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);

            g = compoundCurve([]);
            assert.equal(toWKT(g), 'COMPOUNDCURVE EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const g1 = lineString([ [ 0, 10 ], [ 0, 0 ], [ 5, 0 ], [ 5, 5 ] ]);
            const g2 = multiLineString([ [ [ 5, 5 ], [ 6, 6 ] ] ]);
            assert.throws(() => compoundCurve([ g1, g2 as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be LineString or CircularString. MultiLineString is not allowed',
            });
        });

        it('should throw when input segments are not continuous', () => {
            const g1 = lineString([ [ 0, 10 ], [ 0, 0 ], [ 5, 0 ], [ 5, 5 ] ]);
            const g2 = circularString([ [ 6, 6 ], [ 10, 10 ], [ 10, 0 ] ]);
            assert.throws(() => compoundCurve([ g1, g2 ]), {
                name: 'GEOSError::IllegalArgumentException',
                message: 'Sections of CompoundCurve are not contiguous: curve 0 ends at 5 5 ; curve 1 begins at 6 6',
            });
        });

        it('should throw when input segments includes empty geometry', () => {
            const g1 = lineString([ [ 0, 10 ], [ 0, 0 ], [ 5, 0 ], [ 5, 5 ] ]);
            const g2 = circularString([]);
            const g3 = circularString([ [ 5, 5 ], [ 10, 10 ], [ 10, 0 ] ]);
            assert.throws(() => compoundCurve([ g1, g2, g3 ]), {
                name: 'GEOSError::IllegalArgumentException',
                message: 'Section 1 of CompoundCurve is empty',
            });
        });

    });

    describe('curvePolygon', () => {

        it('should create CurvePolygon from LineString or CircularString or CompoundCurve rings geometries', () => {
            const shell = circularString([ [ 1, 5 ], [ 5, 9 ], [ 9, 5 ], [ 5, 1 ], [ 1, 5 ] ]);
            const hole1 = compoundCurve([
                circularString([ [ 3, 5 ], [ 5, 2 ], [ 7, 5 ] ]),
                lineString([ [ 7, 5 ], [ 3, 5 ] ]),
            ]);
            const hole2 = circularString([ [ 3, 7 ], [ 3, 6 ], [ 4, 6 ], [ 4, 7 ], [ 3, 7 ] ]);
            let g = curvePolygon([ shell, hole1, hole2 ]);
            assert.equal(toWKT(g), 'CURVEPOLYGON (CIRCULARSTRING (1 5, 5 9, 9 5, 5 1, 1 5), COMPOUNDCURVE (CIRCULARSTRING (3 5, 5 2, 7 5), (7 5, 3 5)), CIRCULARSTRING (3 7, 3 6, 4 6, 4 7, 3 7))');

            // not detached
            assert.ok(!shell.detached);
            assert.ok(!hole1.detached);
            assert.ok(!hole2.detached);

            g = curvePolygon([ shell, hole1, hole2 ], { consume: true });
            assert.equal(toWKT(g), 'CURVEPOLYGON (CIRCULARSTRING (1 5, 5 9, 9 5, 5 1, 1 5), COMPOUNDCURVE (CIRCULARSTRING (3 5, 5 2, 7 5), (7 5, 3 5)), CIRCULARSTRING (3 7, 3 6, 4 6, 4 7, 3 7))');

            // detached
            assert.ok(shell.detached);
            assert.ok(hole1.detached);
            assert.ok(hole2.detached);

            g = curvePolygon([]);
            assert.equal(toWKT(g), 'CURVEPOLYGON EMPTY');
        });

        it('should allow to create non-closed rings', () => {
            // test to detect any changes in GEOS (to update docs, tests etc.)
            const g1 = curvePolygon([
                lineString([ [ 0, 0 ], [ 0, 4 ], [ 4, 4 ], [ 4, 0 ] ]),
            ]);
            assert.equal(toWKT(g1), 'CURVEPOLYGON ((0 0, 0 4, 4 4, 4 0))');
            const g2 = curvePolygon([
                circularString([ [ 0, 0 ], [ 0, 4 ], [ 4, 4 ], [ 4, 0 ], [ 1, 0 ] ]),
            ]);
            assert.equal(toWKT(g2), 'CURVEPOLYGON (CIRCULARSTRING (0 0, 0 4, 4 4, 4 0, 1 0))');
            const g3 = curvePolygon([
                compoundCurve([
                    lineString([ [ 0, 0 ], [ 4, 4 ], [ 4, 0 ] ]),
                    circularString([ [ 4, 0 ], [ 3, -1 ], [ 1, 0 ] ]),
                ]),
            ]);
            assert.equal(toWKT(g3), 'CURVEPOLYGON (COMPOUNDCURVE ((0 0, 4 4, 4 0), CIRCULARSTRING (4 0, 3 -1, 1 0)))');
        });

        it('should throw when invalid geometry type is provided', () => {
            const shell = multiLineString([ [ [ 0, 0 ], [ 0, 4 ], [ 4, 4 ] ], [ [ 4, 4 ], [ 4, 0 ], [ 0, 0 ] ] ]);
            assert.throws(() => curvePolygon([ shell as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be LineString, CircularString or CompoundCurve. MultiLineString is not allowed',
            });
        });

    });

    describe('multiCurve', () => {

        it('should create MultiCurve from LineString or CircularString or CompoundCurve geometries', () => {
            const g1 = circularString([ [ 1, 5 ], [ 5, 9 ], [ 9, 5 ] ]);
            const g2 = lineString([ [ 3, 6 ], [ 7, 6 ] ]);
            const g3 = compoundCurve([
                circularString([ [ 3, 5 ], [ 5, 2 ], [ 7, 5 ] ]),
                lineString([ [ 7, 5 ], [ 3, 5 ] ]),
            ]);

            let g = multiCurve([ g1, g2, g3 ]);
            assert.equal(toWKT(g), 'MULTICURVE (CIRCULARSTRING (1 5, 5 9, 9 5), (3 6, 7 6), COMPOUNDCURVE (CIRCULARSTRING (3 5, 5 2, 7 5), (7 5, 3 5)))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);
            assert.ok(!g3.detached);

            g = multiCurve([ g1, g2, g3 ], { consume: true });
            assert.equal(toWKT(g), 'MULTICURVE (CIRCULARSTRING (1 5, 5 9, 9 5), (3 6, 7 6), COMPOUNDCURVE (CIRCULARSTRING (3 5, 5 2, 7 5), (7 5, 3 5)))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);
            assert.ok(g3.detached);

            g = multiCurve([]);
            assert.equal(toWKT(g), 'MULTICURVE EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const shell = multiLineString([ [ [ 0, 0 ], [ 0, 4 ], [ 4, 4 ] ], [ [ 4, 4 ], [ 4, 0 ], [ 0, 0 ] ] ]);
            assert.throws(() => multiCurve([ shell as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be LineString, CircularString or CompoundCurve. MultiLineString is not allowed',
            });
        });

    });

    describe('multiSurface', () => {

        it('should create MultiSurface from Polygon or CurvePolygon geometries', () => {
            const g1 = polygon([ [ [ 0, 0 ], [ 0, 4 ], [ 4, 0 ], [ 0, 0 ] ] ]);
            const g2 = curvePolygon([
                circularString([ [ 4, 2 ], [ 6, 4 ], [ 8, 2 ], [ 6, 0 ], [ 4, 2 ] ]),
            ]);

            let g = multiSurface([ g1, g2 ]);
            assert.equal(toWKT(g), 'MULTISURFACE (((0 0, 0 4, 4 0, 0 0)), CURVEPOLYGON (CIRCULARSTRING (4 2, 6 4, 8 2, 6 0, 4 2)))');

            // not detached
            assert.ok(!g1.detached);
            assert.ok(!g2.detached);

            g = multiSurface([ g1, g2 ], { consume: true });
            assert.equal(toWKT(g), 'MULTISURFACE (((0 0, 0 4, 4 0, 0 0)), CURVEPOLYGON (CIRCULARSTRING (4 2, 6 4, 8 2, 6 0, 4 2)))');

            // detached
            assert.ok(g1.detached);
            assert.ok(g2.detached);

            g = multiSurface([]);
            assert.equal(toWKT(g), 'MULTISURFACE EMPTY');
        });

        it('should throw when invalid geometry type is provided', () => {
            const shell = multiPolygon([
                [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ] ],
            ]);
            assert.throws(() => multiSurface([ shell as any ]), {
                name: 'GEOSError',
                message: 'Geometry must be Polygon or CurvePolygon. MultiPolygon is not allowed',
            });
        });

    });

    describe('box', () => {

        it('should create polygon geometry from bbox', () => {
            const g = box([ 0, 0, 4, 4 ]);
            assert.equal(toWKT(g), 'POLYGON ((0 0, 0 4, 4 4, 4 0, 0 0))');
        });

        it('should throw when box is degenerated', () => {
            const expectedError = { name: 'GEOSError', message: 'Degenerate box' };

            // horizontal line
            assert.throws(() => box([ 0, 0, 4, 0 ]), expectedError);

            // vertical line
            assert.throws(() => box([ 0, 0, 0, 4 ]), expectedError);

            // point
            assert.throws(() => box([ 0, 0, 0, 0 ]), expectedError);
        });

    });

});
