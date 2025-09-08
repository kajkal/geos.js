import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { CoordinateType } from '../../src/geom/Geometry.mjs';
import type { JSON_Geometry } from '../../src/geom/types/JSON.mjs';
import { jsonifyFeatures, jsonifyGeometry } from '../../src/io/jsonify.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('jsonify - GEOS to GeoJSON', () => {

    function verifyResults(wkts: string[], layout: CoordinateType, extended: boolean, expectedGeometries: JSON_Geometry[]) {
        const geometries = wkts.map(wkt => fromWKT(wkt));

        // jsonifyGeometry
        const toGeometries = geometries.map(g => jsonifyGeometry(g, layout, extended));
        assert.deepEqual(toGeometries, expectedGeometries);

        // geosifyGeometry
        const toFeatures = jsonifyFeatures(geometries, layout, extended);
        const expectedFeatures = expectedGeometries.map(geometry => ({
            type: 'Feature',
            geometry,
            properties: null,
            id: undefined,
        }));
        assert.deepEqual(toFeatures, expectedFeatures);
    }

    before(async () => {
        await initializeForTest();
    });

    it('should jsonify Point', () => {
        const input = [
            'POINT EMPTY',
            'POINT (19.847169006933854 50.06004985917869)',
            'POINT Z (19.8471 50.06 271)',
            'POINT M (19.8471 50.06 271)',
            'POINT ZM (19.8471 50.06 271 1.23)',
            'POINT Z (19.8471 50.06 NaN)',
            'POINT M (19.8471 50.06 NaN)',
            'POINT (19.8471 NaN)',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271, 1.23 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN, NaN ] },
            { type: 'Point', coordinates: [ 19.8471, NaN ] },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, NaN ] },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, 1.23 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
            { type: 'Point', coordinates: [ 19.8471, NaN ] },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'Point', coordinates: [] },
            { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, 50.0600 ] },
            { type: 'Point', coordinates: [ 19.8471, NaN ] },
        ]);
    });

    it('should jsonify LineString', () => {
        const input = [
            'LINESTRING EMPTY',
            'LINESTRING (10 10, 10 20, 20 20)',
            'LINESTRING Z (10 10 1, 10 20 5, 20 20 7)',
            'LINESTRING M (10 10 1.1, 10 20 1.2, 20 20 1.3)',
            'LINESTRING ZM (10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3)',
            'LINESTRING Z (10 10 1, 10 20 NaN, 20 20 NaN)',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, NaN, 1.1 ], [ 10, 20, NaN, 1.2 ], [ 20, 20, NaN, 1.3 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, NaN ], [ 20, 20, NaN ] ] },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, NaN ], [ 20, 20, NaN ] ] },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
        ]);
    });

    it('should jsonify LinearRing', () => {
        const input = [
            'LINEARRING EMPTY',
            'LINEARRING (10 10, 10 20, 20 20, 10 10)',
            'LINEARRING ZM (10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3, 10 10 1 1.1)',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ], [ 10, 10 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ], [ 10, 10, 1, 1.1 ] ] },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ], [ 10, 10 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ], [ 10, 10, 1 ] ] },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ], [ 10, 10 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ], [ 10, 10, 1.1 ] ] },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'LineString', coordinates: [] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ], [ 10, 10 ] ] },
            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ], [ 10, 10 ] ] },
        ]);
    });

    it('should jsonify Polygon', () => {
        const input = [
            'POLYGON EMPTY',
            'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10))',
            'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
            'POLYGON Z ((10 10 7, 10 60 5, 60 60 1, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 30 30 4, 20 30 6, 20 20 8))',
            'POLYGON M ((10 10 1.1, 10 60 1.2, 60 10 1.3, 10 10 1.1), (20 20 2.1, 30 20 2.2, 20 30 2.3, 20 20 2.1))',
            'POLYGON ZM ((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1))',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'Polygon', coordinates: [] },
            { type: 'Polygon', coordinates: [ [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ] ] },
            {
                type: 'Polygon',
                coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon',
                coordinates: [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 60, 1 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                    [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 30, 30, 4 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ],
                ],
            }, {
                type: 'Polygon',
                coordinates: [
                    [ [ 10, 10, NaN, 1.1 ], [ 10, 60, NaN, 1.2 ], [ 60, 10, NaN, 1.3 ], [ 10, 10, NaN, 1.1 ] ],
                    [ [ 20, 20, NaN, 2.1 ], [ 30, 20, NaN, 2.2 ], [ 20, 30, NaN, 2.3 ], [ 20, 20, NaN, 2.1 ] ],
                ],
            }, {
                type: 'Polygon',
                coordinates: [
                    [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                    [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'Polygon', coordinates: [] },
            { type: 'Polygon', coordinates: [ [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ] ] },
            {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ] ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 60, 1 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                    [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 30, 30, 4 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                    [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'Polygon', coordinates: [] },
            { type: 'Polygon', coordinates: [ [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ] ] },
            {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ],
                    [ [ 20, 20, 2.1 ], [ 30, 20, 2.2 ], [ 20, 30, 2.3 ], [ 20, 20, 2.1 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ],
                    [ [ 20, 20, 2.1 ], [ 30, 20, 2.2 ], [ 20, 30, 2.3 ], [ 20, 20, 2.1 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'Polygon', coordinates: [] },
            { type: 'Polygon', coordinates: [ [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ] ] },
            {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            }, {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ], [ 20, 20 ] ],
                ],
            },
        ]);
    });

    it('should jsonify MultiPoint', () => {
        const input = [
            'MULTIPOINT EMPTY',
            'MULTIPOINT ZM ((10 10 1 1.1))',
            'MULTIPOINT Z ((10 10 1), (10 20 5), (20 20 7))',
            'MULTIPOINT M ((10 10 1.1), (10 20 1.2), (20 20 1.3))',
            'MULTIPOINT ZM ((10 10 1 1.1), (10 20 5 1.2), (20 20 7 1.3))',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1, 1.1 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, NaN, 1.1 ], [ 10, 20, NaN, 1.2 ], [ 20, 20, NaN, 1.3 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ] },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1.1 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ] },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'MultiPoint', coordinates: [] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
            { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
        ]);
    });

    it('should jsonify MultiLineString', () => {
        const input = [
            'MULTILINESTRING EMPTY',
            'MULTILINESTRING ZM ((10 10 1 1.1, 20 20 5 1.2))',
            'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
            'MULTILINESTRING Z ((10 10 1, 20 20 5, 30 30 9), (40 40 4, 50 50 8))',
            'MULTILINESTRING M ((10 10 1.1, 20 20 1.2, 30 30 1.3), (40 40 2.1, 50 50 2.2))',
            'MULTILINESTRING ZM ((10 10 1 1.1, 20 20 5 1.2, 30 30 9 1.3), (40 40 4 2.1, 50 50 8 2.2))',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'MultiLineString', coordinates: [] },
            { type: 'MultiLineString', coordinates: [ [ [ 10, 10, 1, 1.1 ], [ 20, 20, 5, 1.2 ] ] ] },
            {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1 ], [ 20, 20, 5 ], [ 30, 30, 9 ] ],
                    [ [ 40, 40, 4 ], [ 50, 50, 8 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, NaN, 1.1 ], [ 20, 20, NaN, 1.2 ], [ 30, 30, NaN, 1.3 ] ],
                    [ [ 40, 40, NaN, 2.1 ], [ 50, 50, NaN, 2.2 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1, 1.1 ], [ 20, 20, 5, 1.2 ], [ 30, 30, 9, 1.3 ] ],
                    [ [ 40, 40, 4, 2.1 ], [ 50, 50, 8, 2.2 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'MultiLineString', coordinates: [] },
            { type: 'MultiLineString', coordinates: [ [ [ 10, 10, 1 ], [ 20, 20, 5 ] ] ] },
            {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1 ], [ 20, 20, 5 ], [ 30, 30, 9 ] ],
                    [ [ 40, 40, 4 ], [ 50, 50, 8 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1 ], [ 20, 20, 5 ], [ 30, 30, 9 ] ],
                    [ [ 40, 40, 4 ], [ 50, 50, 8 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'MultiLineString', coordinates: [] },
            { type: 'MultiLineString', coordinates: [ [ [ 10, 10, 1.1 ], [ 20, 20, 1.2 ] ] ] },
            {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1.1 ], [ 20, 20, 1.2 ], [ 30, 30, 1.3 ] ],
                    [ [ 40, 40, 2.1 ], [ 50, 50, 2.2 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10, 1.1 ], [ 20, 20, 1.2 ], [ 30, 30, 1.3 ] ],
                    [ [ 40, 40, 2.1 ], [ 50, 50, 2.2 ] ],
                ],
            },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'MultiLineString', coordinates: [] },
            { type: 'MultiLineString', coordinates: [ [ [ 10, 10 ], [ 20, 20 ] ] ] },
            {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            }, {
                type: 'MultiLineString',
                coordinates: [
                    [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                    [ [ 40, 40 ], [ 50, 50 ] ],
                ],
            },
        ]);
    });

    it('should jsonify MultiPolygon', () => {
        const input = [
            'MULTIPOLYGON EMPTY',
            'MULTIPOLYGON (EMPTY, EMPTY)',
            'MULTIPOLYGON Z (((10 10 7, 10 60 5, 60 10 5, 10 10 7)))',
            'MULTIPOLYGON M (((10 10 1.1, 10 60 1.2, 60 10 1.3, 10 10 1.1)))',
            'MULTIPOLYGON ZM (((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1)))',
            'MULTIPOLYGON ZM (' +
            '((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1)), ' +
            '((70 70 10 3.1, 70 90 15 3.2, 90 70 25 3.3, 70 70 10 3.1))' +
            ')',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'MultiPolygon', coordinates: [] },
            { type: 'MultiPolygon', coordinates: [] },
            {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, NaN, 1.1 ], [ 10, 60, NaN, 1.2 ], [ 60, 10, NaN, 1.3 ], [ 10, 10, NaN, 1.1 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                    [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ],
                ], [
                    [ [ 70, 70, 10, 3.1 ], [ 70, 90, 15, 3.2 ], [ 90, 70, 25, 3.3 ], [ 70, 70, 10, 3.1 ] ],
                ] ],
            },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'MultiPolygon', coordinates: [] },
            { type: 'MultiPolygon', coordinates: [] },
            {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                    [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ],
                ], [
                    [ [ 70, 70, 10 ], [ 70, 90, 15 ], [ 90, 70, 25 ], [ 70, 70, 10 ] ],
                ] ],
            },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'MultiPolygon', coordinates: [] },
            { type: 'MultiPolygon', coordinates: [] },
            {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ],
                    [ [ 20, 20, 2.1 ], [ 30, 20, 2.2 ], [ 20, 30, 2.3 ], [ 20, 20, 2.1 ] ],
                ], [
                    [ [ 70, 70, 3.1 ], [ 70, 90, 3.2 ], [ 90, 70, 3.3 ], [ 70, 70, 3.1 ] ],
                ] ],
            },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'MultiPolygon', coordinates: [] },
            { type: 'MultiPolygon', coordinates: [] },
            {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                ] ],
            }, {
                type: 'MultiPolygon',
                coordinates: [ [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ], [ 20, 20 ] ],
                ], [
                    [ [ 70, 70 ], [ 70, 90 ], [ 90, 70 ], [ 70, 70 ] ],
                ] ],
            },
        ]);
    });

    it('should jsonify GeometryCollection', () => {
        const input = [
            'GEOMETRYCOLLECTION EMPTY',
            'GEOMETRYCOLLECTION ZM (' +
            'POINT ZM (10 10 4 1.23), ' +
            'GEOMETRYCOLLECTION ZM (' +
            'LINESTRING ZM (10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3)' +
            '), ' +
            'MULTIPOINT ZM ((30 30 10 1.1), (40 40 10 1.2))' +
            ')',
        ];
        verifyResults(input, 'XYZM', false, [
            { type: 'GeometryCollection', geometries: [] },
            {
                type: 'GeometryCollection', geometries: [
                    { type: 'Point', coordinates: [ 10, 10, 4, 1.23 ] },
                    {
                        type: 'GeometryCollection', geometries: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ],
                        } ],
                    },
                    { type: 'MultiPoint', coordinates: [ [ 30, 30, 10, 1.1 ], [ 40, 40, 10, 1.2 ] ] },
                ],
            },
        ]);
        verifyResults(input, 'XYZ', false, [
            { type: 'GeometryCollection', geometries: [] },
            {
                type: 'GeometryCollection', geometries: [
                    { type: 'Point', coordinates: [ 10, 10, 4 ] },
                    {
                        type: 'GeometryCollection', geometries: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ],
                        } ],
                    },
                    { type: 'MultiPoint', coordinates: [ [ 30, 30, 10 ], [ 40, 40, 10 ] ] },
                ],
            },
        ]);
        verifyResults(input, 'XYM', false, [
            { type: 'GeometryCollection', geometries: [] },
            {
                type: 'GeometryCollection', geometries: [
                    { type: 'Point', coordinates: [ 10, 10, 1.23 ] },
                    {
                        type: 'GeometryCollection', geometries: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ],
                        } ],
                    },
                    { type: 'MultiPoint', coordinates: [ [ 30, 30, 1.1 ], [ 40, 40, 1.2 ] ] },
                ],
            },
        ]);
        verifyResults(input, 'XY', false, [
            { type: 'GeometryCollection', geometries: [] },
            {
                type: 'GeometryCollection', geometries: [
                    { type: 'Point', coordinates: [ 10, 10 ] },
                    {
                        type: 'GeometryCollection', geometries: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ],
                        } ],
                    },
                    { type: 'MultiPoint', coordinates: [ [ 30, 30 ], [ 40, 40 ] ] },
                ],
            },
        ]);
    });

    it('should jsonify CircularString', () => {
        // should throw in standard mode
        const g = fromWKT('CIRCULARSTRING EMPTY');
        assert.throws(() => jsonifyGeometry(g, 'XYZM', false), {
            name: 'GEOSError',
            message: /^CircularString is not standard GeoJSON geometry/,
        });

        const input = [
            'CIRCULARSTRING EMPTY',
            'CIRCULARSTRING (10 20, 20 30, 30 20)',
            'CIRCULARSTRING Z (10 20 1, 20 30 9, 30 20 3)',
            'CIRCULARSTRING M (10 20 1.1, 20 30 1.2, 30 20 1.3)',
            'CIRCULARSTRING ZM (10 20 1 1.1, 20 30 9 1.2, 30 20 3 1.3)',
        ];
        verifyResults(input, 'XYZM', true, [
            { type: 'CircularString', coordinates: [] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1 ], [ 20, 30, 9 ], [ 30, 20, 3 ] ] },
            {
                type: 'CircularString',
                coordinates: [ [ 10, 20, NaN, 1.1 ], [ 20, 30, NaN, 1.2 ], [ 30, 20, NaN, 1.3 ] ],
            },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1, 1.1 ], [ 20, 30, 9, 1.2 ], [ 30, 20, 3, 1.3 ] ] },
        ]);
        verifyResults(input, 'XYZ', true, [
            { type: 'CircularString', coordinates: [] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1 ], [ 20, 30, 9 ], [ 30, 20, 3 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1 ], [ 20, 30, 9 ], [ 30, 20, 3 ] ] },
        ]);
        verifyResults(input, 'XYM', true, [
            { type: 'CircularString', coordinates: [] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1.1 ], [ 20, 30, 1.2 ], [ 30, 20, 1.3 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20, 1.1 ], [ 20, 30, 1.2 ], [ 30, 20, 1.3 ] ] },
        ]);
        verifyResults(input, 'XY', true, [
            { type: 'CircularString', coordinates: [] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
        ]);
    });

    it('should jsonify CompoundCurve', () => {
        // should throw in standard mode
        const g = fromWKT('COMPOUNDCURVE EMPTY');
        assert.throws(() => jsonifyGeometry(g, 'XYZM', false), {
            name: 'GEOSError',
            message: /^CompoundCurve is not standard GeoJSON geometry/,
        });

        const input = [
            'COMPOUNDCURVE EMPTY',
            'COMPOUNDCURVE ((10 10, 10 20), CIRCULARSTRING (10 20, 20 20, 20 10))',
            'COMPOUNDCURVE Z ((10 10 1, 10 20 5), CIRCULARSTRING Z (10 20 5, 20 20 9, 20 10 9))',
            'COMPOUNDCURVE M ((10 10 1.1, 10 20 1.2), CIRCULARSTRING M (10 20 1.2, 20 20 1.3, 20 10 1.4))',
            'COMPOUNDCURVE ZM ((10 10 1 1.1, 10 20 5 1.2), CIRCULARSTRING ZM (10 20 5 1.2, 20 20 9 1.3, 20 10 9 1.4))',
        ];
        verifyResults(input, 'XYZM', true, [
            { type: 'CompoundCurve', segments: [] },
            {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 5 ], [ 20, 20, 9 ], [ 20, 10, 9 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, NaN, 1.1 ], [ 10, 20, NaN, 1.2 ] ] },
                    {
                        type: 'CircularString',
                        coordinates: [ [ 10, 20, NaN, 1.2 ], [ 20, 20, NaN, 1.3 ], [ 20, 10, NaN, 1.4 ] ],
                    },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ] ] },
                    {
                        type: 'CircularString',
                        coordinates: [ [ 10, 20, 5, 1.2 ], [ 20, 20, 9, 1.3 ], [ 20, 10, 9, 1.4 ] ],
                    },
                ],
            },
        ]);
        verifyResults(input, 'XYZ', true, [
            { type: 'CompoundCurve', segments: [] },
            {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 5 ], [ 20, 20, 9 ], [ 20, 10, 9 ] ] },
                ],
            }, {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 5 ], [ 20, 20, 9 ], [ 20, 10, 9 ] ] },
                ],
            },
        ]);
        verifyResults(input, 'XYM', true, [
            { type: 'CompoundCurve', segments: [] },
            {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 1.2 ], [ 20, 20, 1.3 ], [ 20, 10, 1.4 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 1.2 ], [ 20, 20, 1.3 ], [ 20, 10, 1.4 ] ] },
                ],
            },
        ]);
        verifyResults(input, 'XY', true, [
            { type: 'CompoundCurve', segments: [] },
            {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, {
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            },
        ]);
    });

    it('should jsonify CurvePolygon', () => {
        // should throw in standard mode
        const g = fromWKT('CURVEPOLYGON EMPTY');
        assert.throws(() => jsonifyGeometry(g, 'XYZM', false), {
            name: 'GEOSError',
            message: /^CurvePolygon is not standard GeoJSON geometry/,
        });

        verifyResults([
            'CURVEPOLYGON (COMPOUNDCURVE ((10 80, 80 10), CIRCULARSTRING (80 10, 10 10, 10 80)), (30 40, 20 20, 40 30, 30 40))',
        ], 'XYZM', true, [
            {
                type: 'CurvePolygon', rings: [
                    {
                        type: 'CompoundCurve', segments: [
                            { type: 'LineString', coordinates: [ [ 10, 80 ], [ 80, 10 ] ] },
                            { type: 'CircularString', coordinates: [ [ 80, 10 ], [ 10, 10 ], [ 10, 80 ] ] },
                        ],
                    },
                    { type: 'LineString', coordinates: [ [ 30, 40 ], [ 20, 20 ], [ 40, 30 ], [ 30, 40 ] ] },
                ],
            },
        ]);

        const input = [
            'CURVEPOLYGON EMPTY',
            'CURVEPOLYGON (CIRCULARSTRING (10 50, 40 60, 70 50, 40 30, 10 50))',
            'CURVEPOLYGON Z (CIRCULARSTRING Z (10 50 1, 40 60 4, 70 50 9, 40 30 8, 10 50 1))',
            'CURVEPOLYGON M (CIRCULARSTRING M (10 50 1.1, 40 60 1.2, 70 50 1.3, 40 30 1.4, 10 50 1.1))',
            'CURVEPOLYGON ZM (CIRCULARSTRING ZM (10 50 1 1.1, 40 60 4 1.2, 70 50 9 1.3, 40 30 8 1.4, 10 50 1 1.1))',
        ];
        verifyResults(input, 'XYZM', true, [
            { type: 'CurvePolygon', rings: [] },
            {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1 ], [ 40, 60, 4 ], [ 70, 50, 9 ], [ 40, 30, 8 ], [ 10, 50, 1 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, NaN, 1.1 ], [ 40, 60, NaN, 1.2 ], [ 70, 50, NaN, 1.3 ], [ 40, 30, NaN, 1.4 ], [ 10, 50, NaN, 1.1 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1, 1.1 ], [ 40, 60, 4, 1.2 ], [ 70, 50, 9, 1.3 ], [ 40, 30, 8, 1.4 ], [ 10, 50, 1, 1.1 ] ],
                } ],
            },
        ]);
        verifyResults(input, 'XYZ', true, [
            { type: 'CurvePolygon', rings: [] },
            {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1 ], [ 40, 60, 4 ], [ 70, 50, 9 ], [ 40, 30, 8 ], [ 10, 50, 1 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1 ], [ 40, 60, 4 ], [ 70, 50, 9 ], [ 40, 30, 8 ], [ 10, 50, 1 ] ],
                } ],
            },
        ]);
        verifyResults(input, 'XYM', true, [
            { type: 'CurvePolygon', rings: [] },
            {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1.1 ], [ 40, 60, 1.2 ], [ 70, 50, 1.3 ], [ 40, 30, 1.4 ], [ 10, 50, 1.1 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50, 1.1 ], [ 40, 60, 1.2 ], [ 70, 50, 1.3 ], [ 40, 30, 1.4 ], [ 10, 50, 1.1 ] ],
                } ],
            },
        ]);
        verifyResults(input, 'XY', true, [
            { type: 'CurvePolygon', rings: [] },
            {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            }, {
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 50 ], [ 40, 60 ], [ 70, 50 ], [ 40, 30 ], [ 10, 50 ] ],
                } ],
            },
        ]);
    });

    it('should jsonify MultiCurve', () => {
        // should throw in standard mode
        const g = fromWKT('MULTICURVE EMPTY');
        assert.throws(() => jsonifyGeometry(g, 'XYZM', false), {
            name: 'GEOSError',
            message: /^MultiCurve is not standard GeoJSON geometry/,
        });

        const input = [
            'MULTICURVE EMPTY',
            'MULTICURVE ZM ((10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3), CIRCULARSTRING ZM (10 20 1 1.1, 20 30 9 1.2, 30 20 3 1.3), COMPOUNDCURVE ZM ((10 10 1 1.1, 10 20 5 1.2), CIRCULARSTRING ZM (10 20 5 1.2, 20 20 9 1.3, 20 10 9 1.4)))',
        ];
        verifyResults(input, 'XYZM', true, [
            { type: 'MultiCurve', curves: [] },
            {
                type: 'MultiCurve',
                curves: [ {
                    type: 'LineString',
                    coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ],
                }, {
                    type: 'CircularString',
                    coordinates: [ [ 10, 20, 1, 1.1 ], [ 20, 30, 9, 1.2 ], [ 30, 20, 3, 1.3 ] ],
                }, {
                    type: 'CompoundCurve',
                    segments: [ {
                        type: 'LineString',
                        coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ] ],
                    }, {
                        type: 'CircularString',
                        coordinates: [ [ 10, 20, 5, 1.2 ], [ 20, 20, 9, 1.3 ], [ 20, 10, 9, 1.4 ] ],
                    } ],
                } ],
            },
        ]);
        verifyResults(input, 'XYZ', true, [
            { type: 'MultiCurve', curves: [] },
            {
                type: 'MultiCurve',
                curves: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 1 ], [ 20, 30, 9 ], [ 30, 20, 3 ] ] },
                    {
                        type: 'CompoundCurve',
                        segments: [
                            { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ] ] },
                            { type: 'CircularString', coordinates: [ [ 10, 20, 5 ], [ 20, 20, 9 ], [ 20, 10, 9 ] ] },
                        ],
                    },
                ],
            },
        ]);
        verifyResults(input, 'XYM', true, [
            { type: 'MultiCurve', curves: [] },
            {
                type: 'MultiCurve',
                curves: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ], [ 20, 20, 1.3 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20, 1.1 ], [ 20, 30, 1.2 ], [ 30, 20, 1.3 ] ] },
                    {
                        type: 'CompoundCurve',
                        segments: [
                            { type: 'LineString', coordinates: [ [ 10, 10, 1.1 ], [ 10, 20, 1.2 ] ] },
                            {
                                type: 'CircularString',
                                coordinates: [ [ 10, 20, 1.2 ], [ 20, 20, 1.3 ], [ 20, 10, 1.4 ] ],
                            },
                        ],
                    },
                ],
            },
        ]);
        verifyResults(input, 'XY', true, [
            { type: 'MultiCurve', curves: [] },
            {
                type: 'MultiCurve',
                curves: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
                    {
                        type: 'CompoundCurve',
                        segments: [
                            { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                            { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                        ],
                    },
                ],
            },
        ]);
    });

    it('should jsonify MultiSurface', () => {
        // should throw in standard mode
        const g = fromWKT('MULTISURFACE EMPTY');
        assert.throws(() => jsonifyGeometry(g, 'XYZM', false), {
            name: 'GEOSError',
            message: /^MultiSurface is not standard GeoJSON geometry/,
        });

        const input = [
            'MULTISURFACE EMPTY',
            'MULTISURFACE ZM (((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1)), CURVEPOLYGON ZM (COMPOUNDCURVE ZM ((10 80 5 1.1, 80 10 7 1.2), CIRCULARSTRING ZM (80 10 7 1.2, 10 10 3 1.3, 10 80 5 1.1)), (30 40 2 2.1, 20 20 8 2.2, 40 30 4 2.3, 30 40 2 2.1)))',
        ];
        verifyResults(input, 'XYZM', true, [
            { type: 'MultiSurface', surfaces: [] },
            {
                type: 'MultiSurface',
                surfaces: [ {
                    type: 'Polygon',
                    coordinates: [ [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ], [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ] ],
                }, {
                    type: 'CurvePolygon',
                    rings: [ {
                        type: 'CompoundCurve',
                        segments: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 80, 5, 1.1 ], [ 80, 10, 7, 1.2 ] ],
                        }, {
                            type: 'CircularString',
                            coordinates: [ [ 80, 10, 7, 1.2 ], [ 10, 10, 3, 1.3 ], [ 10, 80, 5, 1.1 ] ],
                        } ],
                    }, {
                        type: 'LineString',
                        coordinates: [ [ 30, 40, 2, 2.1 ], [ 20, 20, 8, 2.2 ], [ 40, 30, 4, 2.3 ], [ 30, 40, 2, 2.1 ] ],
                    } ],
                } ],
            },
        ]);
        verifyResults(input, 'XYZ', true, [
            { type: 'MultiSurface', surfaces: [] },
            {
                type: 'MultiSurface',
                surfaces: [ {
                    type: 'Polygon',
                    coordinates: [ [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ], [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ] ],
                }, {
                    type: 'CurvePolygon',
                    rings: [ {
                        type: 'CompoundCurve',
                        segments: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 80, 5 ], [ 80, 10, 7 ] ],
                        }, { type: 'CircularString', coordinates: [ [ 80, 10, 7 ], [ 10, 10, 3 ], [ 10, 80, 5 ] ] } ],
                    }, {
                        type: 'LineString',
                        coordinates: [ [ 30, 40, 2 ], [ 20, 20, 8 ], [ 40, 30, 4 ], [ 30, 40, 2 ] ],
                    } ],
                } ],
            },
        ]);
        verifyResults(input, 'XYM', true, [
            { type: 'MultiSurface', surfaces: [] },
            {
                type: 'MultiSurface',
                surfaces: [ {
                    type: 'Polygon',
                    coordinates: [ [ [ 10, 10, 1.1 ], [ 10, 60, 1.2 ], [ 60, 10, 1.3 ], [ 10, 10, 1.1 ] ], [ [ 20, 20, 2.1 ], [ 30, 20, 2.2 ], [ 20, 30, 2.3 ], [ 20, 20, 2.1 ] ] ],
                }, {
                    type: 'CurvePolygon',
                    rings: [ {
                        type: 'CompoundCurve',
                        segments: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 80, 1.1 ], [ 80, 10, 1.2 ] ],
                        }, {
                            type: 'CircularString',
                            coordinates: [ [ 80, 10, 1.2 ], [ 10, 10, 1.3 ], [ 10, 80, 1.1 ] ],
                        } ],
                    }, {
                        type: 'LineString',
                        coordinates: [ [ 30, 40, 2.1 ], [ 20, 20, 2.2 ], [ 40, 30, 2.3 ], [ 30, 40, 2.1 ] ],
                    } ],
                } ],
            },
        ]);
        verifyResults(input, 'XY', true, [
            { type: 'MultiSurface', surfaces: [] },
            {
                type: 'MultiSurface',
                surfaces: [ {
                    type: 'Polygon',
                    coordinates: [ [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ], [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ], [ 20, 20 ] ] ],
                }, {
                    type: 'CurvePolygon',
                    rings: [ {
                        type: 'CompoundCurve',
                        segments: [ {
                            type: 'LineString',
                            coordinates: [ [ 10, 80 ], [ 80, 10 ] ],
                        }, { type: 'CircularString', coordinates: [ [ 80, 10 ], [ 10, 10 ], [ 10, 80 ] ] } ],
                    }, { type: 'LineString', coordinates: [ [ 30, 40 ], [ 20, 20 ], [ 40, 30 ], [ 30, 40 ] ] } ],
                } ],
            },
        ]);
    });


    it(`should handle 'extended' param`, () => {
        const input = fromWKT('GEOMETRYCOLLECTION (LINESTRING (10 10, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20))');

        // extended - false
        assert.throws(() => jsonifyGeometry(input, 'XYZM', false), {
            name: 'GEOSError',
            message: `CircularString is not standard GeoJSON geometry. Use 'extended' flavor to jsonify all geometry types.`,
        });
        assert.throws(() => jsonifyFeatures([ input ], 'XYZM', false), {
            name: 'GEOSError',
            message: `CircularString is not standard GeoJSON geometry. Use 'extended' flavor to jsonify all geometry types.`,
        });

        // extended - true
        assert.deepEqual(jsonifyGeometry(input, 'XYZM', true), {
            type: 'GeometryCollection',
            geometries: [
                { type: 'LineString', coordinates: [ [ 10, 10 ], [ 20, 20 ] ] },
                { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
            ],
        });
        assert.deepEqual(jsonifyFeatures([ input ], 'XYZM', true), [ {
            id: undefined,
            type: 'Feature',
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 20, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
                ],
            },
            properties: null,
        } ]);
    });

    it('should include geometry id and props', () => {
        let geom = fromWKT('POINT (0 0)');
        assert.deepEqual(jsonifyFeatures([ geom ]), [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [ 0, 0 ] }, properties: null, id: undefined },
        ]);

        geom = fromWKT('POINT (0 0)');
        geom.id = '100';
        assert.deepEqual(jsonifyFeatures([ geom ]), [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [ 0, 0 ] }, properties: null, id: '100' },
        ]);

        geom = fromWKT('POINT (0 0)');
        geom.props = { some: 'prop' };
        assert.deepEqual(jsonifyFeatures([ geom ]), [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                properties: { some: 'prop' },
                id: undefined,
            },
        ]);

        geom = fromWKT('POINT (0 0)');
        geom.id = '100';
        geom.props = { some: 'prop' };
        assert.deepEqual(jsonifyFeatures([ geom ]), [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ 0, 0 ] },
                properties: { some: 'prop' },
                id: '100',
            },
        ]);
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

        jsonifyFeatures([ fromWKT(`POINT (${Math.random()} ${Math.random()})`) ]);

        assert.equal(malloc.mock.callCount(), 0);
        assert.equal(free.mock.callCount(), 0);

        jsonifyFeatures(Array.from({ length: 1100 }, () => (
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
