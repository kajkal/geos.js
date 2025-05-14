import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { unaryUnion } from '../../src/operation/unary-union.mjs';
import { geosifyGeometry } from '../../src/io/geosify.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';


describe('unaryUnion', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return unaryUnion of point', () => {
        assert.equal(toWKT(unaryUnion(fromWKT('POINT EMPTY'))), 'POINT EMPTY');
        assert.equal(toWKT(unaryUnion(fromWKT('POINT (6 3)'))), 'POINT (6 3)');
        assert.equal(toWKT(unaryUnion(fromWKT('POINT Z (4 5 6)'))), 'POINT Z (4 5 6)');
    });

    it('should return unaryUnion of linear geometry', () => {
        assert.equal(toWKT(unaryUnion(fromWKT('LINESTRING EMPTY'))), 'LINESTRING EMPTY');
        assert.equal(toWKT(unaryUnion(fromWKT('MULTILINESTRING ((0 5, 10 5), (4 -10, 4 10))'))), 'MULTILINESTRING ((0 5, 4 5), (4 5, 10 5), (4 -10, 4 5), (4 5, 4 10))');
    });

    it('should return unaryUnion of multipoint with duplicated points', () => {
        const a = fromWKT('MULTIPOINT ((4 5), (6 7), (4 5), (6 5), (6 7))');
        assert.equal(toWKT(unaryUnion(a)), 'MULTIPOINT ((4 5), (6 5), (6 7))');
    });

    it('should return unaryUnion of multipolygon', () => {
        const a = fromWKT('MULTIPOLYGON (((0 0, 0 10, 10 10, 10 0, 0 0), (1 9, 8 8, 9 1, 1 9)), ((5 10, 15 15, 10 5, 5 10)))');
        assert.equal(toWKT(unaryUnion(a)), 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.166666666666666 6.833333333333333, 6.833333333333333 8.166666666666666, 1 9))');
        assert.equal(toWKT(unaryUnion(a, 1e-4)), 'POLYGON ((0 10, 5 10, 15 15, 10 5, 10 0, 0 0, 0 10), (1 9, 9 1, 8.1667 6.8333, 6.8333 8.1667, 1 9))');
    });

    it('should return unaryUnion of collection of line string and empty point', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (POINT EMPTY, LINESTRING (0 0, 1 1))');
        assert.equal(toWKT(unaryUnion(a)), 'LINESTRING (0 0, 1 1)');
    });

    it('should return unaryUnion of collection of points and line strings', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (POINT(4 5), MULTIPOINT((6 7), (6 5), (6 7)), LINESTRING(0 5, 10 5), LINESTRING(4 -10, 4 10))');
        assert.equal(toWKT(unaryUnion(a)), 'GEOMETRYCOLLECTION (POINT (6 7), LINESTRING (0 5, 4 5), LINESTRING (4 5, 10 5), LINESTRING (4 -10, 4 5), LINESTRING (4 5, 4 10))');
    });

    it('should return unaryUnion of collection of points and polygons', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (POINT(4 5), MULTIPOINT((6 7), (6 5), (6 7)), POLYGON((0 0, 10 0, 10 10, 0 10, 0 0),(5 6, 7 6, 7 8, 5 8, 5 6)))');
        assert.equal(toWKT(unaryUnion(a)), 'GEOMETRYCOLLECTION (POINT (6 7), POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (5 6, 7 6, 7 8, 5 8, 5 6)))');
    });

    it('should return unaryUnion of collection of line strings and polygons', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (MULTILINESTRING((5 7, 12 7), (4 5, 6 5), (5.5 7.5, 6.5 7.5)), POLYGON((0 0, 10 0, 10 10, 0 10, 0 0),(5 6, 7 6, 7 8, 5 8, 5 6)))');
        assert.equal(toWKT(unaryUnion(a)), 'GEOMETRYCOLLECTION (POLYGON ((10 0, 0 0, 0 10, 10 10, 10 7, 10 0), (7 6, 7 7, 7 8, 5 8, 5 7, 5 6, 7 6)), LINESTRING (5 7, 7 7), LINESTRING (10 7, 12 7), LINESTRING (5.5 7.5, 6.5 7.5))');
    });

    it('should return unaryUnion of collection of points, line strings and polygons', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (MULTILINESTRING((5 7, 12 7), (4 5, 6 5), (5.5 7.5, 6.5 7.5)), POLYGON((0 0, 10 0, 10 10, 0 10, 0 0),(5 6, 7 6, 7 8, 5 8, 5 6)), MULTIPOINT((6 6.5), (6 1), (12 2), (6 1)))');
        assert.equal(toWKT(unaryUnion(a)), 'GEOMETRYCOLLECTION (POINT (6 6.5), POINT (12 2), POLYGON ((10 0, 0 0, 0 10, 10 10, 10 7, 10 0), (7 6, 7 7, 7 8, 5 8, 5 7, 5 6, 7 6)), LINESTRING (5 7, 7 7), LINESTRING (10 7, 12 7), LINESTRING (5.5 7.5, 6.5 7.5))');
    });

    it('should throw on geometry with NaN coordinates', () => {
        const a = geosifyGeometry({ type: 'LineString', coordinates: [ [ NaN, NaN ], [ 0, 1 ] ] });
        assert.throws(() => unaryUnion(a), {
            name: 'GeosError',
            message: 'Edge direction cannot be determined because endpoints are equal',
        });
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        assert.throws(() => unaryUnion(a), {
            name: 'GeosError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

    it('(prec) should return unaryUnion of multipoint with duplicated points', () => {
        const a = fromWKT('MULTIPOINT ((4 5), (6 7), (4 5), (6 5), (6 7))');
        assert.equal(toWKT(unaryUnion(a, 2)), 'MULTIPOINT ((4 6), (6 6), (6 8))');
    });

    it('(prec) should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        assert.throws(() => unaryUnion(a, 0), {
            name: 'GeosError::UnsupportedOperationException',
            message: 'Curved geometry types are not supported.',
        });
    });

});
