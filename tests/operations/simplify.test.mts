import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';
import { simplify } from '../../src/operations/simplify.mjs';


describe('simplify', () => {

    let a: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should handle empty geometry', () => {
        const emptyGeometries = [
            'POINT EMPTY',
            'LINESTRING EMPTY',
            'POLYGON EMPTY',
            'MULTIPOINT EMPTY',
            'MULTILINESTRING EMPTY',
            'MULTIPOLYGON EMPTY',
            'GEOMETRYCOLLECTION EMPTY',
            'CIRCULARSTRING EMPTY',
            'COMPOUNDCURVE EMPTY',
            'CURVEPOLYGON EMPTY',
            'MULTICURVE EMPTY',
            'MULTISURFACE EMPTY',
        ];
        for (const wkt of emptyGeometries) {
            a = fromWKT(wkt);
            // assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), wkt); // TODO
            assert.equal(toWKT(simplify(a, 1)), wkt);
        }
    });

    it('should keep points unchanged', () => {
        const points = [
            'POINT (1 1)',
            'MULTIPOINT ((1 1), (2 2))',
            'MULTIPOINT ((1 1), (1 1), (2 2))',
        ];
        for (const wkt of points) {
            a = fromWKT(wkt);
            assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), wkt);
            assert.equal(toWKT(simplify(a, 1)), wkt);
            assert.equal(toWKT(simplify(a, 10, { preserveTopology: false })), wkt);
            assert.equal(toWKT(simplify(a, 10)), wkt);
        }
    });

    it('should simplify line', () => {
        a = fromWKT('LINESTRING (0 0, 1 0, 10 0)');
        assert.equal(toWKT(simplify(a, 0, { preserveTopology: false })), 'LINESTRING (0 0, 10 0)');
        assert.equal(toWKT(simplify(a, 0)), 'LINESTRING (0 0, 10 0)');

        a = fromWKT('LINESTRING (0 0, 1 2, 10 0)');
        assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), 'LINESTRING (0 0, 1 2, 10 0)');
        assert.equal(toWKT(simplify(a, 1)), 'LINESTRING (0 0, 1 2, 10 0)');
        assert.equal(toWKT(simplify(a, 2, { preserveTopology: false })), 'LINESTRING (0 0, 10 0)');
        assert.equal(toWKT(simplify(a, 2)), 'LINESTRING (0 0, 10 0)');

        a = fromWKT('MULTILINESTRING ((0 10, 20 20, 40 20), (0 0, 20 10, 40 10), (15 5, 40 5))');
        assert.equal(toWKT(simplify(a, 4, { preserveTopology: false })), 'MULTILINESTRING ((0 10, 20 20, 40 20), (0 0, 20 10, 40 10), (15 5, 40 5))');
        assert.equal(toWKT(simplify(a, 4)), 'MULTILINESTRING ((0 10, 20 20, 40 20), (0 0, 20 10, 40 10), (15 5, 40 5))');
        assert.equal(toWKT(simplify(a, 5, { preserveTopology: false })), 'MULTILINESTRING ((0 10, 40 20), (0 0, 40 10), (15 5, 40 5))');
        assert.equal(toWKT(simplify(a, 5)), 'MULTILINESTRING ((0 10, 40 20), (0 0, 20 10, 40 10), (15 5, 40 5))');
    });

    it('should simplify polygon', () => {
        a = fromWKT('POLYGON ((2 2, 6 2, 8 2, 8 8, 2 8, 2 2))');
        assert.equal(toWKT(simplify(a, 0, { preserveTopology: false })), 'POLYGON ((2 2, 8 2, 8 8, 2 8, 2 2))');
        assert.equal(toWKT(simplify(a, 0)), 'POLYGON ((2 2, 8 2, 8 8, 2 8, 2 2))');

        // thin polygon
        a = fromWKT('POLYGON ((2 2, 8 3, 8 2, 2 2))');
        assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), 'POLYGON EMPTY'); // collapsed
        assert.equal(toWKT(simplify(a, 1)), 'POLYGON ((2 2, 8 3, 8 2, 2 2))');

        // polygon with hole
        a = fromWKT('POLYGON ((2 2, 6 3, 8 2, 8 8, 2 8, 2 2), (6 7, 7 7, 7 6, 6 7))');
        assert.equal(toWKT(simplify(a, 0, { preserveTopology: false })), 'POLYGON ((2 2, 6 3, 8 2, 8 8, 2 8, 2 2), (6 7, 7 7, 7 6, 6 7))');
        assert.equal(toWKT(simplify(a, 0)), 'POLYGON ((2 2, 6 3, 8 2, 8 8, 2 8, 2 2), (6 7, 7 7, 7 6, 6 7))');
        assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), 'POLYGON ((2 2, 8 2, 8 8, 2 8, 2 2))'); // hole removed
        assert.equal(toWKT(simplify(a, 1)), 'POLYGON ((2 2, 8 2, 8 8, 2 8, 2 2), (6 7, 7 7, 7 6, 6 7))');

        // polygon with edge collapse
        a = fromWKT('POLYGON ((2 2, 1 10, 2 18, 8 18, 2 10, 8 2, 2 2))');
        assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), 'MULTIPOLYGON (((2 2, 2 10, 8 2, 2 2)), ((2 10, 2 18, 8 18, 2 10)))');
        assert.equal(toWKT(simplify(a, 1)), 'POLYGON ((2 2, 1 10, 2 18, 8 18, 2 10, 8 2, 2 2))');

        // self-touching exterior ring forming hole
        a = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0, 4 2, 2 4, 0 0))');
        assert.equal(toWKT(simplify(a, 1, { preserveTopology: false })), 'POLYGON ((0 0, 0 10, 10 0, 0 0), (0 0, 4 2, 2 4, 0 0))'); // hole created
        assert.equal(toWKT(simplify(a, 1)), 'POLYGON ((0 0, 0 10, 10 0, 0 0, 4 2, 2 4, 0 0))'); // invalid input -> invalid result

        // polygon with large hole near edge
        a = fromWKT('POLYGON ((10 10, 10 80, 50 90, 90 80, 90 10, 10 10), (80 20, 20 20, 50 90, 80 20))');
        assert.equal(toWKT(simplify(a, 10, { preserveTopology: false })), 'POLYGON ((10 10, 10 80, 45.714285714285715 80, 20 20, 80 20, 54.285714285714285 80, 90 80, 90 10, 10 10))'); // hole is now open
        assert.equal(toWKT(simplify(a, 10)), 'POLYGON ((10 10, 10 80, 50 90, 90 80, 90 10, 10 10), (80 20, 20 20, 50 90, 80 20))');

        // polygon with small hole near simplified edge
        a = fromWKT('POLYGON ((10 10, 10 80, 50 90, 90 80, 90 10, 10 10), (70 81, 30 81, 50 90, 70 81))');
        assert.equal(toWKT(simplify(a, 10, { preserveTopology: false })), 'POLYGON ((10 10, 10 80, 90 80, 90 10, 10 10))');
        assert.equal(toWKT(simplify(a, 10)), 'POLYGON ((10 10, 10 80, 50 90, 90 80, 90 10, 10 10), (70 81, 30 81, 50 90, 70 81))');

        // multipolygon with small element removed
        a = fromWKT('MULTIPOLYGON (((10 90, 10 10, 40 40, 90 10, 47 57, 10 90)), ((90 90, 90 85, 85 85, 85 90, 90 90)))');
        assert.equal(toWKT(simplify(a, 10, { preserveTopology: false })), 'POLYGON ((10 90, 10 10, 40 40, 90 10, 10 90))');
        assert.equal(toWKT(simplify(a, 10)), 'MULTIPOLYGON (((10 90, 10 10, 40 40, 90 10, 10 90)), ((85 90, 90 85, 85 85, 85 90)))');
    });

    it('should simplify all geometries from the geometry collection', () => {
        a = fromWKT('GEOMETRYCOLLECTION (POLYGON ((10 90, 10 10, 40 40, 90 10, 47 57, 10 90)), LINESTRING (30 90, 65 65, 90 30), MULTIPOINT ((80 90), (90 90)))');
        assert.equal(toWKT(simplify(a, 10, { preserveTopology: false })), 'GEOMETRYCOLLECTION (POLYGON ((10 90, 10 10, 40 40, 90 10, 10 90)), LINESTRING (30 90, 90 30), MULTIPOINT ((80 90), (90 90)))');
        assert.equal(toWKT(simplify(a, 10)), 'GEOMETRYCOLLECTION (POLYGON ((10 90, 10 10, 40 40, 90 10, 10 90)), LINESTRING (30 90, 90 30), MULTIPOINT ((80 90), (90 90)))');
    });

    it('should throw when tolerance is negative', () => {
        a = fromWKT('LINESTRING (0 0, 2 0, 8 0)');
        assert.throws(() => simplify(a, -1), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Tolerance must be non-negative',
        });
        assert.throws(() => simplify(a, -1, { preserveTopology: false }), {
            name: 'GEOSError::IllegalArgumentException',
            message: 'Tolerance must be non-negative',
        });
    });

    it('should throw on unsupported geometry type', () => {
        const unsupportedGeometries = [
            'CIRCULARSTRING (0 0, 1 1, 2 0)',
            'COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))',
            'CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))',
            'MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))',
            'MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))',
        ];
        for (const wkt of unsupportedGeometries) {
            a = fromWKT(wkt);
            assert.throws(() => simplify(a, 1), {
                name: 'GEOSError::IllegalArgumentException',
                message: 'Unknown Geometry subtype.',
            });
            assert.throws(() => simplify(a, 1, { preserveTopology: false }), {
                name: 'GEOSError::IllegalArgumentException',
                message: 'Unknown Geometry subtype.',
            });
        }
    });

});
