import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';


describe('Geometry::orientPolygons', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should handle empty polygons', () => {
        const a = fromWKT('POLYGON EMPTY');
        assert.equal(toWKT(a.orientPolygons('ccw')), 'POLYGON EMPTY');
    });

    it('should orient holes in opposite direction than shell', () => {
        const a = fromWKT('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1))');
        assert.equal(toWKT(a.orientPolygons('ccw')), 'POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (1 1, 1 2, 2 2, 2 1, 1 1))');
        assert.equal(toWKT(a.orientPolygons('cw')), 'POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1))');
    });

    it('should process all polygons in collection', () => {
        const a = fromWKT('MULTIPOLYGON (((0 0, 10 0, 10 10, 0 10, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1)), ((100 100, 200 100, 200 200, 100 100)))');
        assert.equal(toWKT(a.orientPolygons('ccw')), 'MULTIPOLYGON (((0 0, 10 0, 10 10, 0 10, 0 0), (1 1, 1 2, 2 2, 2 1, 1 1)), ((100 100, 200 100, 200 200, 100 100)))');
        assert.equal(toWKT(a.orientPolygons('cw')), 'MULTIPOLYGON (((0 0, 0 10, 10 10, 10 0, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1)), ((100 100, 200 200, 200 100, 100 100)))');
    });

    it('should modify only polygonal geometries from collection', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1)), LINESTRING (100 100, 200 100, 200 200, 100 100))');
        assert.equal(toWKT(a.orientPolygons('cw')), 'GEOMETRYCOLLECTION (POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1)), LINESTRING (100 100, 200 100, 200 200, 100 100))');
    });

    it('should handle nested collections correctly', () => {
        const a = fromWKT('GEOMETRYCOLLECTION (GEOMETRYCOLLECTION (MULTIPOLYGON (((0 0, 10 0, 10 10, 0 10, 0 0)))))');
        assert.equal(toWKT(a.orientPolygons('ccw')), 'GEOMETRYCOLLECTION (GEOMETRYCOLLECTION (MULTIPOLYGON (((0 0, 10 0, 10 10, 0 10, 0 0)))))');
        assert.equal(toWKT(a.orientPolygons('cw')), 'GEOMETRYCOLLECTION (GEOMETRYCOLLECTION (MULTIPOLYGON (((0 0, 0 10, 10 10, 10 0, 0 0)))))');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CURVEPOLYGON (COMPOUNDCURVE( CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 0 0)))');
        assert.throws(() => a.orientPolygons(), {
            name: 'GeosError::UnsupportedOperationException',
            message: 'Curved geometries not supported.',
        });
    });

});
