import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';
import { fromGeoJSON, toGeoJSON } from '../../src/io/GeoJSON.mjs';
import { point } from '../../src/helpers/helpers.mjs';


describe('GeoJSON', () => {

    before(async () => {
        await initializeForTest();
    });

    describe('from', () => {

        it('should read GeoJSON Geometry as geometry object', () => {
            const geometry = fromGeoJSON({
                type: 'Point',
                coordinates: [ 0, 0 ],
            });
            assert.equal(Array.isArray(geometry), false);
            assert.equal(toWKT(geometry), 'POINT (0 0)');
            assert.equal(geometry.props, undefined);
        });

        it('should read GeoJSON Feature as geometry object', () => {
            const geometryWithoutProps = fromGeoJSON({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                properties: null,
            });
            assert.equal(Array.isArray(geometryWithoutProps), false);
            assert.equal(toWKT(geometryWithoutProps), 'POINT (0 0)');
            assert.equal(geometryWithoutProps.props, undefined);

            const geometryWithProps = fromGeoJSON({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                properties: { name: 'A' },
            });
            assert.equal(Array.isArray(geometryWithProps), false);
            assert.equal(toWKT(geometryWithProps), 'POINT (0 0)');
            assert.deepEqual(geometryWithProps.props, { name: 'A' });

            const geometryWithId = fromGeoJSON({
                id: 1,
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                properties: null,
            });
            assert.equal(Array.isArray(geometryWithId), false);
            assert.equal(toWKT(geometryWithId), 'POINT (0 0)');
            assert.equal(geometryWithId.id, 1);
        });

        it('should read GeoJSON FeatureCollection as array of geometry objects', () => {
            const noGeometries = fromGeoJSON({
                type: 'FeatureCollection',
                features: [],
            });
            assert.equal(Array.isArray(noGeometries), true);
            assert.deepEqual(noGeometries, []);

            const geometries = fromGeoJSON({
                type: 'FeatureCollection',
                features: [ {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [ 0, 0, 10 ] },
                    properties: { name: 'A' },
                }, {
                    id: 0,
                    type: 'Feature',
                    geometry: {
                        type: 'GeometryCollection', geometries: [
                            { type: 'Point', coordinates: [ 1, 1, 11 ] },
                            { type: 'Point', coordinates: [ 2, 2 ] },
                        ],
                    },
                    properties: { name: 'B' },
                } ],
            });
            assert.equal(Array.isArray(geometries), true);
            assert.equal(geometries.length, 2);
            assert.deepEqual(geometries.map(g => toWKT(g)), [
                'POINT Z (0 0 10)',
                'GEOMETRYCOLLECTION Z (POINT Z (1 1 11), POINT (2 2))',
            ]);
            assert.deepEqual(geometries.map(g => g.props), [
                { name: 'A' },
                { name: 'B' },
            ]);
            assert.deepEqual(geometries.map(g => g.id), [
                undefined,
                0,
            ]);
        });

        it('should throw on invalid GeoJSON data', () => {
            // missing geometry
            assert.throws(() => fromGeoJSON(null!));
            assert.throws(() => fromGeoJSON({
                type: 'Feature',
            } as any), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid GeoJSON geometry: undefined',
            });
            assert.throws(() => fromGeoJSON({
                type: 'Feature',
                geometry: null!,
                properties: null,
            }), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid GeoJSON geometry: null',
            });
            assert.throws(() => fromGeoJSON({} as any), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid GeoJSON geometry: {}',
            });

            // invalid geometries
            assert.throws(() => fromGeoJSON({
                type: 'LineString',
                coordinates: [ [ 0, 0 ] ],
            }), {
                name: 'InvalidGeoJSONError',
                message: /^Invalid LineString: /,
            });
            assert.throws(() => fromGeoJSON({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [ [ 0, 0 ] ],
                },
                properties: null,
            }), {
                name: 'InvalidGeoJSONError',
                message: /^Invalid LineString: /,
            });
            assert.throws(() => fromGeoJSON({
                type: 'FeatureCollection',
                features: [ {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [ [ 0, 0 ] ],
                    },
                    properties: null,
                } ],
            }), {
                name: 'InvalidGeoJSONError',
                message: /^Invalid LineString: /,
            });
        });

    });

    describe('to', () => {

        it('should create GeoJSON Feature from geometry object', () => {
            const geometryWithoutProps = point([ 0, 0, 10 ]);
            assert.deepEqual(toGeoJSON(geometryWithoutProps), {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0, 10 ] },
                properties: null,
                id: undefined,
            });

            const geometryWithProps = point([ 1, 1 ], { properties: { name: 'A' } });
            assert.deepEqual(toGeoJSON(geometryWithProps), {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 1, 1 ] },
                properties: { name: 'A' },
                id: undefined,
            });

            const geometryWithId = point([ 1, 1 ], { id: 0 });
            assert.deepEqual(toGeoJSON(geometryWithId), {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 1, 1 ] },
                properties: null,
                id: 0,
            });
        });

        it('should create GeoJSON FeatureCollection from array of geometry objects', () => {
            const g1 = point([ 0, 0 ], { properties: { name: 'A' } });
            const g2 = point([ 1, 1 ], { properties: { name: 'B' } });
            const g3 = point([ 2, 2, 10 ], { id: 0 });
            assert.deepEqual(toGeoJSON([ g1, g2, g3 ]), {
                type: 'FeatureCollection',
                features: [ {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                    properties: { name: 'A' },
                    id: undefined,
                }, {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [ 1, 1 ] },
                    properties: { name: 'B' },
                    id: undefined,
                }, {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [ 2, 2, 10 ] },
                    properties: null,
                    id: 0,
                } ],
            });
        });

        it('should throw on unsupported geometry type', () => {
            const g = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => toGeoJSON(g), {
                name: 'GEOSError',
                message: 'Unsupported geometry type CircularString',
            });
            assert.throws(() => toGeoJSON([ g ]), {
                name: 'GEOSError',
                message: 'Unsupported geometry type CircularString',
            });
        });

    });

});
