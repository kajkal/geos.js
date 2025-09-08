import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { JSON_Geometry } from '../../src/geom/types/JSON.mjs';
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

        it(`should map coordinates according to the 'layout' option`, () => {
            const json: JSON_Geometry = { type: 'Point', coordinates: [ 10, 20, 30, 40 ] };

            // XYZM by default
            assert.equal(toWKT(fromGeoJSON(json)), 'POINT ZM (10 20 30 40)');

            const xyzm = fromGeoJSON(json, { layout: 'XYZM' });
            assert.equal(toWKT(xyzm), 'POINT ZM (10 20 30 40)');

            const xyz = fromGeoJSON(json, { layout: 'XYZ' });
            assert.equal(toWKT(xyz), 'POINT Z (10 20 30)');

            const xym = fromGeoJSON(json, { layout: 'XYM' });
            assert.equal(toWKT(xym), 'POINT M (10 20 30)');

            const xy = fromGeoJSON(json, { layout: 'XY' });
            assert.equal(toWKT(xy), 'POINT (10 20)');

            const xyNOTxyz = fromGeoJSON(
                { type: 'Point', coordinates: [ 10, 20 ] },
                { layout: 'XYZ' },
            );
            assert.equal(toWKT(xyNOTxyz), 'POINT (10 20)');

            const xyzNOTxyzm = fromGeoJSON(
                { type: 'Point', coordinates: [ 10, 20, 30 ] },
                { layout: 'XYZM' },
            );
            assert.equal(toWKT(xyzNOTxyzm), 'POINT Z (10 20 30)');

            const xymNOTxyz = fromGeoJSON(
                { type: 'Point', coordinates: [ 10, 20, 30 ] },
                { layout: 'XYM' },
            );
            assert.equal(toWKT(xymNOTxyz), 'POINT M (10 20 30)');
        });

        it('should throw on invalid GeoJSON data', () => {
            // missing geometry
            assert.throws(() => fromGeoJSON(null!));
            assert.throws(() => fromGeoJSON({
                type: 'Feature',
            } as any), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid geometry',
                details: undefined,
                geometry: undefined,
            });
            assert.throws(() => fromGeoJSON({
                type: 'Feature',
                geometry: null!,
                properties: null,
            }), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid geometry',
                details: undefined,
                geometry: null,
            });
            assert.throws(() => fromGeoJSON({} as any), {
                name: 'InvalidGeoJSONError',
                message: 'Invalid geometry',
                details: undefined,
                geometry: {},
            });

            // invalid geometries
            assert.throws(() => fromGeoJSON({
                type: 'LineString',
                coordinates: [ [ 0, 0 ] ],
            }), {
                name: 'InvalidGeoJSONError',
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: { type: 'LineString', coordinates: [ [ 0, 0 ] ] },
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
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: { type: 'LineString', coordinates: [ [ 0, 0 ] ] },
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
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: { type: 'LineString', coordinates: [ [ 0, 0 ] ] },
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

        it(`should map coordinates according to the 'layout' option`, () => {
            const xyzm = fromWKT('POINT ZM (10 20 30 40)');

            // XYZ by default
            assert.deepEqual(
                toGeoJSON(xyzm).geometry,
                { type: 'Point', coordinates: [ 10, 20, 30 ] },
            );
            assert.deepEqual(
                toGeoJSON(xyzm, { layout: 'XYZM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20, 30, 40 ] },
            );
            assert.deepEqual(
                toGeoJSON(xyzm, { layout: 'XYZ' }).geometry,
                { type: 'Point', coordinates: [ 10, 20, 30 ] },
            );
            assert.deepEqual(
                toGeoJSON(xyzm, { layout: 'XYM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20, 40 ] },
            );
            assert.deepEqual(
                toGeoJSON(xyzm, { layout: 'XY' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );

            // XYZM when Z and M are missing
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT (10 20)'), { layout: 'XYZM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );
            // XYZM when M is missing
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT Z (10 20 30)'), { layout: 'XYZM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20, 30 ] },
            );
            // XYZM when Z is missing (will insert NaN)
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT M (10 20 40)'), { layout: 'XYZM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20, NaN, 40 ] },
            );
            // XYZM when empty
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT EMPTY'), { layout: 'XYZM' }).geometry,
                { type: 'Point', coordinates: [] },
            );

            // XYZ when Z is missing
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT (10 20)'), { layout: 'XYZ' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );
            // XYZ when Z is missing but M is present
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT M (10 20 40)'), { layout: 'XYZ' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );
            // XYZ when empty
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT EMPTY'), { layout: 'XYZ' }).geometry,
                { type: 'Point', coordinates: [] },
            );

            // XYM when M is missing
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT (10 20)'), { layout: 'XYM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );
            // XYM when M is missing but Z is present
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT Z (10 20 30)'), { layout: 'XYM' }).geometry,
                { type: 'Point', coordinates: [ 10, 20 ] },
            );
            // XYM when empty
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT EMPTY'), { layout: 'XYM' }).geometry,
                { type: 'Point', coordinates: [] },
            );

            // XY when empty
            assert.deepEqual(
                toGeoJSON(fromWKT('POINT EMPTY'), { layout: 'XY' }).geometry,
                { type: 'Point', coordinates: [] },
            );
        });

        it(`should handle geometry types according to the 'flavor' option`, () => {
            const curvedGeometry = fromWKT('CIRCULARSTRING (10 20, 20 30, 30 20)');

            // should throw by default
            assert.throws(() => toGeoJSON(curvedGeometry), {
                name: 'GEOSError',
                message: 'CircularString is not standard GeoJSON geometry. Use \'extended\' flavor to jsonify all geometry types.',
            });
            assert.throws(() => toGeoJSON([ curvedGeometry ]), {
                name: 'GEOSError',
                message: 'CircularString is not standard GeoJSON geometry. Use \'extended\' flavor to jsonify all geometry types.',
            });

            // should throw with 'strict' flavor
            assert.throws(() => toGeoJSON(curvedGeometry, { flavor: 'strict' }), {
                name: 'GEOSError',
                message: 'CircularString is not standard GeoJSON geometry. Use \'extended\' flavor to jsonify all geometry types.',
            });
            assert.throws(() => toGeoJSON([ curvedGeometry ], { flavor: 'strict' }), {
                name: 'GEOSError',
                message: 'CircularString is not standard GeoJSON geometry. Use \'extended\' flavor to jsonify all geometry types.',
            });

            // should jsonify with 'extended' flavor
            assert.deepEqual(
                toGeoJSON(curvedGeometry, { flavor: 'extended' }).geometry,
                { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            );
            assert.doesNotThrow(() => toGeoJSON([ curvedGeometry ], { flavor: 'extended' }));
        });

    });

});
