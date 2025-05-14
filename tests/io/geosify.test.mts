import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { geosifyGeometries, geosifyGeometry } from '../../src/io/geosify.mjs';
import { toWKT } from '../../src/io/wkt.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('geosify - GeoJSON to GEOS', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should geosify Point', () => {
        const geometries = geosifyGeometries([
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
            { type: 'Point', coordinates: [ 19.8471 ] },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'POINT EMPTY',
            'POINT (19.847169006933854 50.06004985917869)',
            'POINT Z (19.8471 50.06 271)',
            'POINT Z (19.8471 50.06 NaN)',
            'POINT (19.8471 NaN)',
        ]);
    });

    it('should geosify LineString', () => {
        const geometries = geosifyGeometries([
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548 ], [ 19.9376, 50.0605 ], [ 19.9390, 50.0620 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548, 213 ], [ 19.9376, 50.0605, 221 ], [ 19.9390, 50.0620, 222 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548, 213 ], [ 19.9376, 50.0605 ] ] },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'LINESTRING EMPTY',
            'LINESTRING (19.9384 50.0548, 19.9376 50.0605, 19.939 50.062)',
            'LINESTRING Z (19.9384 50.0548 213, 19.9376 50.0605 221, 19.939 50.062 222)',
            'LINESTRING Z (19.9384 50.0548 213, 19.9376 50.0605 NaN)',
        ]);
    });

    it('should throw on invalid LineString', () => {
        assert.throws(() => geosifyGeometry({
            type: 'LineString',
            coordinates: [ [ 19.9384, 50.0548, 213 ] ],
        }), {
            name: 'GeosError',
            message: 'Invalid LineString {"type":"LineString","coordinates":[[19.9384,50.0548,213]]}',
        });
    });

    it('should geosify Polygon', () => {
        const geometries = geosifyGeometries([
            { type: 'Polygon', coordinates: [] },
            { type: 'Polygon', coordinates: [ [] ] },
            {
                type: 'Polygon', coordinates: [
                    [ [ 19.9068, 50.0569 ], [ 19.9226, 50.0591 ], [ 19.9024, 50.0623 ], [ 19.9068, 50.0569 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 19.9068, 50.0569 ], [ 19.9226, 50.0591 ], [ 19.9024, 50.0623 ], [ 19.9068, 50.0569 ] ],
                    [ [ 19.9069, 50.0602 ], [ 19.9155, 50.0591 ], [ 19.9091, 50.0583 ], [ 19.9069, 50.0602 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 19.9068, 50.0569, 205 ], [ 19.9226, 50.0591, 206 ], [ 19.9024, 50.0623, 207 ], [ 19.9068, 50.0569, 205 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 19.9068, 50.0569, 205 ], [ 19.9226, 50.0591, 206 ], [ 19.9024, 50.0623, 207 ], [ 19.9068, 50.0569, 205 ] ],
                    [ [ 19.9069, 50.0602, 205 ], [ 19.9155, 50.0591, 206 ], [ 19.9091, 50.0583, 207 ], [ 19.9069, 50.0602, 205 ] ],
                ],
            },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'POLYGON EMPTY',
            'POLYGON EMPTY',
            'POLYGON ((19.9068 50.0569, 19.9226 50.0591, 19.9024 50.0623, 19.9068 50.0569))',
            'POLYGON ((19.9068 50.0569, 19.9226 50.0591, 19.9024 50.0623, 19.9068 50.0569), (19.9069 50.0602, 19.9155 50.0591, 19.9091 50.0583, 19.9069 50.0602))',
            'POLYGON Z ((19.9068 50.0569 205, 19.9226 50.0591 206, 19.9024 50.0623 207, 19.9068 50.0569 205))',
            'POLYGON Z (' +
            '(19.9068 50.0569 205, 19.9226 50.0591 206, 19.9024 50.0623 207, 19.9068 50.0569 205), ' +
            '(19.9069 50.0602 205, 19.9155 50.0591 206, 19.9091 50.0583 207, 19.9069 50.0602 205)' +
            ')',
        ]);
    });

    it('should throw on invalid Polygon', () => {
        assert.throws(() => geosifyGeometry({
            type: 'Polygon',
            coordinates: [ [ [ 19.9068, 50.0569 ], [ 19.9226, 50.0591 ] ] ],
        }), {
            name: 'GeosError',
            message: 'Invalid Polygon {"type":"Polygon","coordinates":[[[19.9068,50.0569],[19.9226,50.0591]]]}',
        });
    });

    it('should geosify MultiPoint', () => {
        const geometries = geosifyGeometries([
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540, 206 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540 ], [ 19.9343, 50.0497 ], [ 19.9449, 50.0455 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540, 206 ], [ 19.9343, 50.0497, 205.5 ], [ 19.9449, 50.0455, 205 ] ] },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'MULTIPOINT EMPTY',
            'MULTIPOINT ((19.9283 50.054))',
            'MULTIPOINT Z ((19.9283 50.054 206))',
            'MULTIPOINT ((19.9283 50.054), (19.9343 50.0497), (19.9449 50.0455))',
            'MULTIPOINT Z ((19.9283 50.054 206), (19.9343 50.0497 205.5), (19.9449 50.0455 205))',
        ]);
    });

    it('should geosify MultiLineString', () => {
        const geometries = geosifyGeometries([
            { type: 'MultiLineString', coordinates: [] },
            { type: 'MultiLineString', coordinates: [ [ [ 19.9383, 50.0545 ], [ 19.9382, 50.0540 ] ] ] },
            {
                type: 'MultiLineString', coordinates: [
                    [ [ 19.9383, 50.0545 ], [ 19.9382, 50.0540 ] ],
                    [ [ 19.9386, 50.0542 ], [ 19.9359, 50.0534 ], [ 19.9354, 50.0529 ] ],
                ],
            },
            { type: 'MultiLineString', coordinates: [ [ [ 19.9383, 50.0545, 213 ], [ 19.9382, 50.0540, 212 ] ] ] },
            {
                type: 'MultiLineString', coordinates: [
                    [ [ 19.9383, 50.0545, 213 ], [ 19.9382, 50.0540, 212 ] ],
                    [ [ 19.9386, 50.0542, 216 ], [ 19.9359, 50.0534, 222 ], [ 19.9354, 50.0529, 218 ] ],
                ],
            },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'MULTILINESTRING EMPTY',
            'MULTILINESTRING ((19.9383 50.0545, 19.9382 50.054))',
            'MULTILINESTRING ((19.9383 50.0545, 19.9382 50.054), (19.9386 50.0542, 19.9359 50.0534, 19.9354 50.0529))',
            'MULTILINESTRING Z ((19.9383 50.0545 213, 19.9382 50.054 212))',
            'MULTILINESTRING Z ((19.9383 50.0545 213, 19.9382 50.054 212), (19.9386 50.0542 216, 19.9359 50.0534 222, 19.9354 50.0529 218))',
        ]);
    });

    it('should throw on invalid MultiLineString', () => {
        assert.throws(() => geosifyGeometry({
            type: 'MultiLineString',
            coordinates: [ [ [ 19.9383, 50.0545 ] ] ],
        }), {
            name: 'GeosError',
            message: 'Invalid MultiLineString {"type":"MultiLineString","coordinates":[[[19.9383,50.0545]]]}',
        });
    });

    it('should geosify MultiPolygon', () => {
        const geometries = geosifyGeometries([
            { type: 'MultiPolygon', coordinates: [] },
            {
                type: 'MultiPolygon', coordinates: [
                    [
                        [ [ 19.9068, 50.0569 ], [ 19.9226, 50.0591 ], [ 19.9024, 50.0623 ], [ 19.9068, 50.0569 ] ],
                        [ [ 19.9069, 50.0602 ], [ 19.9155, 50.0591 ], [ 19.9091, 50.0583 ], [ 19.9069, 50.0602 ] ],
                    ],
                    [
                        [ [ 19.9139, 50.0655 ], [ 19.9123, 50.0612 ], [ 19.9196, 50.0600 ], [ 19.9189, 50.0644 ], [ 19.9139, 50.0655 ] ],
                    ],
                ],
            },
            {
                type: 'MultiPolygon', coordinates: [
                    [
                        [ [ 19.9068, 50.0569, 205 ], [ 19.9226, 50.0591, 206 ], [ 19.9024, 50.0623, 207 ], [ 19.9068, 50.0569, 205 ] ],
                        [ [ 19.9069, 50.0602, 205 ], [ 19.9155, 50.0591, 206 ], [ 19.9091, 50.0583, 207 ], [ 19.9069, 50.0602, 205 ] ],
                    ],
                    [
                        [ [ 19.9139, 50.0655, 208 ], [ 19.9123, 50.0612, 207 ], [ 19.9196, 50.0600, 207 ], [ 19.9189, 50.0644, 207 ], [ 19.9139, 50.0655, 208 ] ],
                    ],
                ],
            },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'MULTIPOLYGON EMPTY',
            'MULTIPOLYGON (' +
            '((19.9068 50.0569, 19.9226 50.0591, 19.9024 50.0623, 19.9068 50.0569),' +
            ' (19.9069 50.0602, 19.9155 50.0591, 19.9091 50.0583, 19.9069 50.0602)), ' +
            '((19.9139 50.0655, 19.9123 50.0612, 19.9196 50.06, 19.9189 50.0644, 19.9139 50.0655))' +
            ')',
            'MULTIPOLYGON Z (' +
            '((19.9068 50.0569 205, 19.9226 50.0591 206, 19.9024 50.0623 207, 19.9068 50.0569 205),' +
            ' (19.9069 50.0602 205, 19.9155 50.0591 206, 19.9091 50.0583 207, 19.9069 50.0602 205)), ' +
            '((19.9139 50.0655 208, 19.9123 50.0612 207, 19.9196 50.06 207, 19.9189 50.0644 207, 19.9139 50.0655 208))' +
            ')',
        ]);
    });

    it('should throw on invalid MultiPolygon', () => {
        assert.throws(() => geosifyGeometry({
            type: 'MultiPolygon',
            coordinates: [ [ [ [ 19.9068, 50.0569 ], [ 19.9226, 50.0591 ] ] ] ],
        }), {
            name: 'GeosError',
            message: 'Invalid MultiPolygon {"type":"MultiPolygon","coordinates":[[[[19.9068,50.0569],[19.9226,50.0591]]]]}',
        });
    });

    it('should geosify GeometryCollection', () => {
        const geometries = geosifyGeometries([
            { type: 'GeometryCollection', geometries: [] },
            {
                type: 'GeometryCollection', geometries: [
                    { type: 'Point', coordinates: [ 19.9379879336, 50.0615117772 ] },
                    {
                        type: 'GeometryCollection', geometries: [
                            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548 ], [ 19.9376, 50.0605 ], [ 19.9390, 50.0620 ] ] },
                        ],
                    },
                    { type: 'Point', coordinates: [ 19.9379879336, 50.0615117772 ] },
                ],
            },
        ]);
        assert.deepEqual(geometries.map(g => toWKT(g)), [
            'GEOMETRYCOLLECTION EMPTY',
            'GEOMETRYCOLLECTION (' +
            'POINT (19.9379879336 50.0615117772), ' +
            'GEOMETRYCOLLECTION (LINESTRING (19.9384 50.0548, 19.9376 50.0605, 19.939 50.062)), ' +
            'POINT (19.9379879336 50.0615117772)' +
            ')',
        ]);
    });

    it('should throw on invalid GeoJSON geometry', () => {
        assert.throws(() => geosifyGeometry({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [ 1, 1 ] },
        } as any), {
            name: 'GeosError',
            message: 'Unexpected geometry type. Expected one of [Point,LineString,Polygon,MultiPoint,MultiLineString,MultiPolygon,GeometryCollection] received "Feature"',
        });
    });

    it('should create geometries with correct bbox', () => {
        // GEOS calculates envelope on geometry creation
        assert.deepEqual(
            geosifyGeometry({ type: 'Point', coordinates: [ 1, 1 ] }).bbox(),
            [ 1, 1, 1, 1 ],
        );
        assert.deepEqual(
            geosifyGeometry({ type: 'LineString', coordinates: [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ] ] }).bbox(),
            [ 0, -1, 4, 1 ],
        );
        assert.deepEqual(
            geosifyGeometry({ type: 'Polygon', coordinates: [ [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ], [ 1, 1 ] ] ] }).bbox(),
            [ 0, -1, 4, 1 ],
        );
        assert.deepEqual(
            geosifyGeometry({ type: 'MultiPoint', coordinates: [ [ 1, 1 ], [ 2, 1 ] ] }).bbox(),
            [ 1, 1, 2, 1 ],
        );
        assert.deepEqual(
            geosifyGeometry({ type: 'MultiLineString', coordinates: [ [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ] ], [ [ 1, 4 ], [ 2, 2 ] ] ] }).bbox(),
            [ 0, -1, 4, 4 ],
        );
        assert.deepEqual(
            geosifyGeometry({
                type: 'MultiPolygon',
                coordinates: [
                    [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ],
                    [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 2, 2 ] ] ],
                ],
            }).bbox(),
            [ 0, 0, 3, 3 ],
        );
        assert.deepEqual(
            geosifyGeometry({
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [ 1, 1 ] },
                    { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
                    { type: 'Polygon', coordinates: [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 2, 2 ] ] ] },
                ],
            }).bbox(),
            [ 0, 0, 3, 3 ],
        );
    });

    it('should create tmp buffer when default one is too small', () => {
        const malloc = mock.method(geos, 'malloc');
        const free = mock.method(geos, 'free');

        geosifyGeometries([
            { type: 'Point', coordinates: [ 1, 2, 3 ] },
        ]);

        assert.equal(malloc.mock.callCount(), 0);
        assert.equal(free.mock.callCount(), 0);

        geosifyGeometries(Array.from({ length: 1000 }, () => (
            { type: 'Point', coordinates: [ Math.random(), Math.random() ] }
        )));

        assert.equal(malloc.mock.callCount(), 1);
        const mallocCall = malloc.mock.calls[ 0 ];
        assert.deepEqual(mallocCall.arguments, [ 20012 ]); // (buffer meta) 8 + (headers) 1000*4 + (coords) 1000*2*8 + 4 bytes for optional alignment
        assert.equal(free.mock.callCount(), 1);
        const freeCall = free.mock.calls[ 0 ];
        assert.deepEqual(freeCall.arguments, [ mallocCall.result ]);
    });

});
