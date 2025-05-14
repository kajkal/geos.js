import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { jsonifyGeometries, jsonifyGeometry } from '../../src/io/jsonify.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('jsonify - GEOS to GeoJSON', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should jsonify Point', () => {
        const geometries = jsonifyGeometries([
            'POINT EMPTY',
            'POINT (19.847169006933854 50.06004985917869)',
            'POINT Z (19.8471 50.06 271)',
            'POINT M (19.8471 50.06 10)',
            'POINT ZM (19.8471 50.06 271 10)',
            'POINT Z (19.8471 50.06 NaN)',
            'POINT (19.8471 NaN)',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
            { type: 'Point', coordinates: [ 19.8471, NaN ] },
        ]);
    });

    it('should jsonify LineString', () => {
        const geometries = jsonifyGeometries([
            'LINESTRING EMPTY',
            'LINESTRING (19.9384 50.0548, 19.9376 50.0605, 19.939 50.062)',
            'LINESTRING Z (19.9384 50.0548 213, 19.9376 50.0605 221, 19.939 50.062 222)',
            'LINESTRING M (19.9384 50.0548 10, 19.9376 50.0605 11, 19.939 50.062 12)',
            'LINESTRING ZM (19.9384 50.0548 213 10, 19.9376 50.0605 221 11, 19.939 50.062 222 12)',
            'LINESTRING Z (19.9384 50.0548 213, 19.9376 50.0605 NaN)',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548 ], [ 19.9376, 50.0605 ], [ 19.9390, 50.0620 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548, 213 ], [ 19.9376, 50.0605, 221 ], [ 19.9390, 50.0620, 222 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548 ], [ 19.9376, 50.0605 ], [ 19.9390, 50.0620 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548, 213 ], [ 19.9376, 50.0605, 221 ], [ 19.9390, 50.0620, 222 ] ] },
            { type: 'LineString', coordinates: [ [ 19.9384, 50.0548, 213 ], [ 19.9376, 50.0605, NaN ] ] },
        ]);
    });

    it('should jsonify Polygon', () => {
        const geometries = jsonifyGeometries([
            'POLYGON EMPTY',
            'POLYGON ((19.9068 50.0569, 19.9226 50.0591, 19.9024 50.0623, 19.9068 50.0569))',
            'POLYGON ((19.9068 50.0569, 19.9226 50.0591, 19.9024 50.0623, 19.9068 50.0569), (19.9069 50.0602, 19.9155 50.0591, 19.9091 50.0583, 19.9069 50.0602))',
            'POLYGON Z ((19.9068 50.0569 205, 19.9226 50.0591 206, 19.9024 50.0623 207, 19.9068 50.0569 205))',
            'POLYGON Z (' +
            '(19.9068 50.0569 205, 19.9226 50.0591 206, 19.9024 50.0623 207, 19.9068 50.0569 205), ' +
            '(19.9069 50.0602 205, 19.9155 50.0591 206, 19.9091 50.0583 207, 19.9069 50.0602 205)' +
            ')',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
            { type: 'Polygon', coordinates: [] },
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
    });

    it('should jsonify MultiPoint', () => {
        const geometries = jsonifyGeometries([
            'MULTIPOINT EMPTY',
            'MULTIPOINT ((19.9283 50.054))',
            'MULTIPOINT Z ((19.9283 50.054 206))',
            'MULTIPOINT ((19.9283 50.054), (19.9343 50.0497), (19.9449 50.0455))',
            'MULTIPOINT Z ((19.9283 50.054 206), (19.9343 50.0497 205.5), (19.9449 50.0455 205))',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540, 206 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540 ], [ 19.9343, 50.0497 ], [ 19.9449, 50.0455 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 19.9283, 50.0540, 206 ], [ 19.9343, 50.0497, 205.5 ], [ 19.9449, 50.0455, 205 ] ] },
        ]);
    });

    it('should jsonify MultiLineString', () => {
        const geometries = jsonifyGeometries([
            'MULTILINESTRING EMPTY',
            'MULTILINESTRING ((19.9383 50.0545, 19.9382 50.054))',
            'MULTILINESTRING ((19.9383 50.0545, 19.9382 50.054), (19.9386 50.0542, 19.9359 50.0534, 19.9354 50.0529))',
            'MULTILINESTRING Z ((19.9383 50.0545 213, 19.9382 50.054 212))',
            'MULTILINESTRING Z ((19.9383 50.0545 213, 19.9382 50.054 212), (19.9386 50.0542 216, 19.9359 50.0534 222, 19.9354 50.0529 218))',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
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
    });

    it('should jsonify MultiPolygon', () => {
        const geometries = jsonifyGeometries([
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
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
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
    });

    it('should jsonify GeometryCollection', () => {
        const geometries = jsonifyGeometries([
            'GEOMETRYCOLLECTION EMPTY',
            'GEOMETRYCOLLECTION (' +
            'POINT (19.9379879336 50.0615117772), ' +
            'GEOMETRYCOLLECTION (LINESTRING (19.9384 50.0548, 19.9376 50.0605, 19.939 50.062)), ' +
            'POINT (19.9379879336 50.0615117772)' +
            ')',
        ].map(wkt => fromWKT(wkt)));
        assert.deepEqual(geometries, [
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
    });

    it('should throw on not GeoJSON geometry', () => {
        assert.throws(() => jsonifyGeometry(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), {
            name: 'GeosError',
            message: 'Unsupported geometry type CircularString',
        });
    });

    it('should create tmp [out] buffer when default one is too small', () => {
        const malloc = mock.method(geos, 'malloc');
        const free = mock.method(geos, 'free');

        jsonifyGeometry(fromWKT('POINT Z (19.8471 50.06 271)'));

        assert.equal(malloc.mock.callCount(), 0);
        assert.equal(free.mock.callCount(), 0);

        const bigGeometry = fromWKT(`MULTIPOINT (${
            Array.from({ length: 1100 }, () => `(${Math.random()} ${Math.random()})`).join(', ')
        })`);

        malloc.mock.resetCalls();
        free.mock.resetCalls();

        jsonifyGeometry(bigGeometry);

        assert.equal(malloc.mock.callCount(), 0); // tmp [out] buffer was created by Wasm not by JS
        assert.equal(free.mock.callCount(), 1); // tmp [out] buffer was freed by JS
    });

    it('should create tmp [in] and [out] buffer when default one is too small', () => {
        const malloc = mock.method(geos, 'malloc');
        const free = mock.method(geos, 'free');

        jsonifyGeometries([ fromWKT('POINT Z (19.8471 50.06 271)') ]);

        assert.equal(malloc.mock.callCount(), 0);
        assert.equal(free.mock.callCount(), 0);

        jsonifyGeometries(Array.from({ length: 1100 }, () => (
            fromWKT(`POINT (${Math.random()} ${Math.random()})`)
        )));

        assert.equal(malloc.mock.callCount(), 1);
        const mallocCall = malloc.mock.calls[ 0 ];
        assert.deepEqual(mallocCall.arguments, [ 4412 ]); // 12 + 1100*4
        // 2 buffers where freed, tmp [in] buffer and tmp [out] buffer
        assert.equal(free.mock.callCount(), 2);
        assert.deepEqual(free.mock.calls[ 0 ].arguments, [ mallocCall.result ]);
    });

});
