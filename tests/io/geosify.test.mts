import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { JSON_Feature, JSON_Geometry } from '../../src/geom/types/JSON.mjs';
import type { CoordinateType } from '../../src/geom/Geometry.mjs';
import { geosifyFeatures, geosifyGeometry } from '../../src/io/geosify.mjs';
import { bounds } from '../../src/measurement/bounds.mjs';
import { toWKT } from '../../src/io/WKT.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('geosify - GeoJSON to GEOS', () => {

    function verifyResults(geometries: JSON_Geometry[], layout: CoordinateType, expectedWKTs: string[]) {
        // geosifyGeometry
        const fromGeometries = geometries.map(g => geosifyGeometry(g, layout));
        assert.deepEqual(fromGeometries.map(g => toWKT(g)), expectedWKTs);

        // geosifyFeatures
        const features = geometries.map<JSON_Feature>(geometry => ({ type: 'Feature', geometry, properties: null }));
        const fromFeatures = geosifyFeatures(features, layout);
        assert.deepEqual(fromFeatures.map(g => toWKT(g)), expectedWKTs);
    }

    before(async () => {
        await initializeForTest();
    });

    describe('Point', () => {

        it('should geosify Point', () => {
            const input: JSON_Geometry[] = [
                { type: 'Point', coordinates: [] },
                { type: 'Point', coordinates: [ 19.847169006933854, 50.06004985917869 ] },
                { type: 'Point', coordinates: [ 19.8471, 50.0600, 271 ] },
                { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN ] },
                { type: 'Point', coordinates: [ 19.8471, 50.0600, 271, 1.23 ] },
                { type: 'Point', coordinates: [ 19.8471, 50.0600, 271, NaN ] },
                { type: 'Point', coordinates: [ 19.8471, 50.0600, NaN, NaN ] },
                { type: 'Point', coordinates: [ 19.8471 ] },
            ];
            verifyResults(input, 'XYZM', [
                'POINT EMPTY',
                'POINT (19.847169006933854 50.06004985917869)',
                'POINT Z (19.8471 50.06 271)',
                'POINT Z (19.8471 50.06 NaN)',
                'POINT ZM (19.8471 50.06 271 1.23)',
                'POINT ZM (19.8471 50.06 271 NaN)',
                'POINT ZM (19.8471 50.06 NaN NaN)',
                'POINT (19.8471 NaN)',
            ]);
            verifyResults(input, 'XYZ', [
                'POINT EMPTY',
                'POINT (19.847169006933854 50.06004985917869)',
                'POINT Z (19.8471 50.06 271)',
                'POINT Z (19.8471 50.06 NaN)',
                'POINT Z (19.8471 50.06 271)',
                'POINT Z (19.8471 50.06 271)',
                'POINT Z (19.8471 50.06 NaN)',
                'POINT (19.8471 NaN)',
            ]);
            verifyResults(input, 'XYM', [
                'POINT EMPTY',
                'POINT (19.847169006933854 50.06004985917869)',
                'POINT M (19.8471 50.06 271)',
                'POINT M (19.8471 50.06 NaN)',
                'POINT M (19.8471 50.06 271)',
                'POINT M (19.8471 50.06 271)',
                'POINT M (19.8471 50.06 NaN)',
                'POINT (19.8471 NaN)',
            ]);
            verifyResults(input, 'XY', [
                'POINT EMPTY',
                'POINT (19.847169006933854 50.06004985917869)',
                'POINT (19.8471 50.06)',
                'POINT (19.8471 50.06)',
                'POINT (19.8471 50.06)',
                'POINT (19.8471 50.06)',
                'POINT (19.8471 50.06)',
                'POINT (19.8471 NaN)',
            ]);
        });

    });

    describe('LineString', () => {

        it('should geosify LineString', () => {
            const input: JSON_Geometry[] = [
                { type: 'LineString', coordinates: [] },
                { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
                { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
                { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ] },
                { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20 ], [ 20, 20 ] ] }, // geom dim is determined based on the first point
            ];
            verifyResults(input, 'XYZM', [
                'LINESTRING EMPTY',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING Z (10 10 1, 10 20 5, 20 20 7)',
                'LINESTRING ZM (10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3)',
                'LINESTRING Z (10 10 1, 10 20 NaN, 20 20 NaN)',
            ]);
            verifyResults(input, 'XYZ', [
                'LINESTRING EMPTY',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING Z (10 10 1, 10 20 5, 20 20 7)',
                'LINESTRING Z (10 10 1, 10 20 5, 20 20 7)',
                'LINESTRING Z (10 10 1, 10 20 NaN, 20 20 NaN)',
            ]);
            verifyResults(input, 'XYM', [
                'LINESTRING EMPTY',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING M (10 10 1, 10 20 5, 20 20 7)',
                'LINESTRING M (10 10 1, 10 20 5, 20 20 7)',
                'LINESTRING M (10 10 1, 10 20 NaN, 20 20 NaN)',
            ]);
            verifyResults(input, 'XY', [
                'LINESTRING EMPTY',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING (10 10, 10 20, 20 20)',
                'LINESTRING (10 10, 10 20, 20 20)',
            ]);
        });

        it('should throw if there are not enough points', () => {
            const lineWithOnePosition: JSON_Geometry = {
                type: 'LineString',
                coordinates: [ [ 10, 10 ] ],
            };
            assert.throws(() => geosifyGeometry(lineWithOnePosition, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: lineWithOnePosition,
            });
        });

    });

    describe('Polygon', () => {

        it('should geosify Polygon', () => {
            const input: JSON_Geometry[] = [
                { type: 'Polygon', coordinates: [] },
                { type: 'Polygon', coordinates: [ [] ] },
                {
                    type: 'Polygon', coordinates: [
                        [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    ],
                }, {
                    type: 'Polygon', coordinates: [
                        [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                        [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                    ],
                }, {
                    type: 'Polygon', coordinates: [
                        [ [ 10, 10, 7 ], [ 10, 60, 5 ], [ 60, 60, 1 ], [ 60, 10, 5 ], [ 10, 10, 7 ] ],
                        [ [ 20, 20, 8 ], [ 30, 20, 6 ], [ 30, 30, 4 ], [ 20, 30, 6 ], [ 20, 20, 8 ] ],
                    ],
                }, {
                    type: 'Polygon', coordinates: [
                        [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                        [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ],
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'POLYGON EMPTY',
                'POLYGON EMPTY',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10))',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
                'POLYGON Z ((10 10 7, 10 60 5, 60 60 1, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 30 30 4, 20 30 6, 20 20 8))',
                'POLYGON ZM ((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1))',
            ]);
            verifyResults(input, 'XYZ', [
                'POLYGON EMPTY',
                'POLYGON EMPTY',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10))',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
                'POLYGON Z ((10 10 7, 10 60 5, 60 60 1, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 30 30 4, 20 30 6, 20 20 8))',
                'POLYGON Z ((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8))',
            ]);
            verifyResults(input, 'XYM', [
                'POLYGON EMPTY',
                'POLYGON EMPTY',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10))',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
                'POLYGON M ((10 10 7, 10 60 5, 60 60 1, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 30 30 4, 20 30 6, 20 20 8))',
                'POLYGON M ((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8))',
            ]);
            verifyResults(input, 'XY', [
                'POLYGON EMPTY',
                'POLYGON EMPTY',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10))',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
                'POLYGON ((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20))',
                'POLYGON ((10 10, 10 60, 60 10, 10 10), (20 20, 30 20, 20 30, 20 20))',
            ]);
        });

        it('should throw if any ring is invalid or not closed', () => {
            const polyWithExteriorRingWithTwoPositions: JSON_Geometry = {
                type: 'Polygon',
                coordinates: [ [ [ 10, 10 ], [ 10, 20 ] ] ],
            };
            assert.throws(() => geosifyGeometry(polyWithExteriorRingWithTwoPositions, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'Polygon ring must have at leat 3 points',
                details: 'found 2',
                geometry: polyWithExteriorRingWithTwoPositions,
            });
            const polyWithInteriorRingNotClosed: JSON_Geometry = {
                type: 'Polygon', coordinates: [
                    [ [ 10, 10 ], [ 10, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                    [ [ 20, 20 ], [ 30, 20 ], [ 20, 30 ] ],
                ],
            };
            assert.throws(() => geosifyGeometry(polyWithInteriorRingNotClosed, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'Polygon ring must be closed',
                details: 'points [20,20] and [20,30] are not equal',
                geometry: polyWithInteriorRingNotClosed,
            });
        });

    });

    describe('MultiPoint', () => {

        it('should geosify MultiPoint', () => {
            const input: JSON_Geometry[] = [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [ [ 10, 10 ] ] },
                { type: 'MultiPoint', coordinates: [ [ 10, 10, 1, 1.1 ] ] },
                { type: 'MultiPoint', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
                { type: 'MultiPoint', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
                { type: 'MultiPoint', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ] },
            ];
            verifyResults(input, 'XYZM', [
                'MULTIPOINT EMPTY',
                'MULTIPOINT ((10 10))',
                'MULTIPOINT ZM ((10 10 1 1.1))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
                'MULTIPOINT Z ((10 10 1), (10 20 5), (20 20 7))',
                'MULTIPOINT ZM ((10 10 1 1.1), (10 20 5 1.2), (20 20 7 1.3))',
            ]);
            verifyResults(input, 'XYZ', [
                'MULTIPOINT EMPTY',
                'MULTIPOINT ((10 10))',
                'MULTIPOINT Z ((10 10 1))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
                'MULTIPOINT Z ((10 10 1), (10 20 5), (20 20 7))',
                'MULTIPOINT Z ((10 10 1), (10 20 5), (20 20 7))',
            ]);
            verifyResults(input, 'XYM', [
                'MULTIPOINT EMPTY',
                'MULTIPOINT ((10 10))',
                'MULTIPOINT M ((10 10 1))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
                'MULTIPOINT M ((10 10 1), (10 20 5), (20 20 7))',
                'MULTIPOINT M ((10 10 1), (10 20 5), (20 20 7))',
            ]);
            verifyResults(input, 'XY', [
                'MULTIPOINT EMPTY',
                'MULTIPOINT ((10 10))',
                'MULTIPOINT ((10 10))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
                'MULTIPOINT ((10 10), (10 20), (20 20))',
            ]);
        });

    });

    describe('MultiLineString', () => {

        it('should geosify MultiLineString', () => {
            const input: JSON_Geometry[] = [
                { type: 'MultiLineString', coordinates: [] },
                { type: 'MultiLineString', coordinates: [ [ [ 10, 10 ], [ 20, 20 ] ] ] },
                { type: 'MultiLineString', coordinates: [ [ [ 10, 10, 1, 1.1 ], [ 20, 20, 5, 1.2 ] ] ] },
                {
                    type: 'MultiLineString', coordinates: [
                        [ [ 10, 10 ], [ 20, 20 ], [ 30, 30 ] ],
                        [ [ 40, 40 ], [ 50, 50 ] ],
                    ],
                }, {
                    type: 'MultiLineString', coordinates: [
                        [ [ 10, 10, 1, 1.1 ], [ 20, 20, 5, 1.2 ], [ 30, 30, 9, 1.3 ] ],
                        [ [ 40, 40, 4, 2.1 ], [ 50, 50, 8, 2.2 ] ],
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'MULTILINESTRING EMPTY',
                'MULTILINESTRING ((10 10, 20 20))',
                'MULTILINESTRING ZM ((10 10 1 1.1, 20 20 5 1.2))',
                'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
                'MULTILINESTRING ZM ((10 10 1 1.1, 20 20 5 1.2, 30 30 9 1.3), (40 40 4 2.1, 50 50 8 2.2))',
            ]);
            verifyResults(input, 'XYZ', [
                'MULTILINESTRING EMPTY',
                'MULTILINESTRING ((10 10, 20 20))',
                'MULTILINESTRING Z ((10 10 1, 20 20 5))',
                'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
                'MULTILINESTRING Z ((10 10 1, 20 20 5, 30 30 9), (40 40 4, 50 50 8))',
            ]);
            verifyResults(input, 'XYM', [
                'MULTILINESTRING EMPTY',
                'MULTILINESTRING ((10 10, 20 20))',
                'MULTILINESTRING M ((10 10 1, 20 20 5))',
                'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
                'MULTILINESTRING M ((10 10 1, 20 20 5, 30 30 9), (40 40 4, 50 50 8))',
            ]);
            verifyResults(input, 'XY', [
                'MULTILINESTRING EMPTY',
                'MULTILINESTRING ((10 10, 20 20))',
                'MULTILINESTRING ((10 10, 20 20))',
                'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
                'MULTILINESTRING ((10 10, 20 20, 30 30), (40 40, 50 50))',
            ]);
        });

        it('should throw if any line is invalid', () => {
            const multiLineWithInvalidLine: JSON_Geometry = {
                type: 'MultiLineString',
                coordinates: [ [ [ 10, 10 ] ] ],
            };
            assert.throws(() => geosifyGeometry(multiLineWithInvalidLine, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: multiLineWithInvalidLine,
            });
        });

    });

    describe('MultiPolygon', () => {

        it('should geosify MultiPolygon', () => {
            const input: JSON_Geometry[] = [
                { type: 'MultiPolygon', coordinates: [] },
                { type: 'MultiPolygon', coordinates: [ [ [] ], [] ] },
                {
                    type: 'MultiPolygon', coordinates: [ [
                        [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                        [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ],
                    ], [
                        [ [ 70, 70 ], [ 70, 90 ], [ 90, 90 ], [ 90, 70 ], [ 70, 70 ] ],
                    ] ],
                }, {
                    type: 'MultiPolygon', coordinates: [ [
                        [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                        [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ],
                    ], [
                        [ [ 70, 70, 10, 3.1 ], [ 70, 90, 15, 3.2 ], [ 90, 70, 25, 3.3 ], [ 70, 70, 10, 3.1 ] ],
                    ] ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'MULTIPOLYGON EMPTY',
                'MULTIPOLYGON (EMPTY, EMPTY)',
                'MULTIPOLYGON (' +
                '((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20)), ' +
                '((70 70, 70 90, 90 90, 90 70, 70 70))' +
                ')',
                'MULTIPOLYGON ZM (' +
                '((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1)), ' +
                '((70 70 10 3.1, 70 90 15 3.2, 90 70 25 3.3, 70 70 10 3.1))' +
                ')',
            ]);
            verifyResults(input, 'XYZ', [
                'MULTIPOLYGON EMPTY',
                'MULTIPOLYGON (EMPTY, EMPTY)',
                'MULTIPOLYGON (' +
                '((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20)), ' +
                '((70 70, 70 90, 90 90, 90 70, 70 70))' +
                ')',
                'MULTIPOLYGON Z (' +
                '((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8)), ' +
                '((70 70 10, 70 90 15, 90 70 25, 70 70 10))' +
                ')',
            ]);
            verifyResults(input, 'XYM', [
                'MULTIPOLYGON EMPTY',
                'MULTIPOLYGON (EMPTY, EMPTY)',
                'MULTIPOLYGON (' +
                '((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20)), ' +
                '((70 70, 70 90, 90 90, 90 70, 70 70))' +
                ')',
                'MULTIPOLYGON M (' +
                '((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8)), ' +
                '((70 70 10, 70 90 15, 90 70 25, 70 70 10))' +
                ')',
            ]);
            verifyResults(input, 'XY', [
                'MULTIPOLYGON EMPTY',
                'MULTIPOLYGON (EMPTY, EMPTY)',
                'MULTIPOLYGON (' +
                '((10 10, 10 60, 60 60, 60 10, 10 10), (20 20, 30 20, 30 30, 20 30, 20 20)), ' +
                '((70 70, 70 90, 90 90, 90 70, 70 70))' +
                ')',
                'MULTIPOLYGON (' +
                '((10 10, 10 60, 60 10, 10 10), (20 20, 30 20, 20 30, 20 20)), ' +
                '((70 70, 70 90, 90 70, 70 70))' +
                ')',
            ]);
        });

        it('should throw if any polygon is invalid', () => {
            const multiPolyWithInvalidPoly: JSON_Geometry = {
                type: 'MultiPolygon',
                coordinates: [ [ [ [ 10, 10 ], [ 10, 20 ] ] ] ],
            };
            assert.throws(() => geosifyGeometry(multiPolyWithInvalidPoly, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'Polygon ring must have at leat 3 points',
                details: 'found 2',
                geometry: multiPolyWithInvalidPoly,
            });
        });

    });

    describe('GeometryCollection', () => {

        it('should geosify GeometryCollection', () => {
            const input: JSON_Geometry[] = [
                { type: 'GeometryCollection', geometries: [] },
                {
                    type: 'GeometryCollection', geometries: [
                        { type: 'Point', coordinates: [ 10, 10 ] },
                        {
                            type: 'GeometryCollection', geometries: [
                                { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ], [ 20, 20, 7 ] ] },
                                { type: 'GeometryCollection', geometries: [] },
                            ],
                        },
                        { type: 'MultiPoint', coordinates: [ [ 30, 30, 10, 1.1 ], [ 40, 40, 10, 1.2 ] ] },
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'GEOMETRYCOLLECTION EMPTY',
                'GEOMETRYCOLLECTION ZM (' +
                'POINT (10 10), ' +
                'GEOMETRYCOLLECTION Z (' +
                'LINESTRING Z (10 10 1, 10 20 5, 20 20 7), ' +
                'GEOMETRYCOLLECTION EMPTY' +
                '), ' +
                'MULTIPOINT ZM ((30 30 10 1.1), (40 40 10 1.2))' +
                ')',
            ]);
            verifyResults(input, 'XYZ', [
                'GEOMETRYCOLLECTION EMPTY',
                'GEOMETRYCOLLECTION Z (' +
                'POINT (10 10), ' +
                'GEOMETRYCOLLECTION Z (' +
                'LINESTRING Z (10 10 1, 10 20 5, 20 20 7), ' +
                'GEOMETRYCOLLECTION EMPTY' +
                '), ' +
                'MULTIPOINT Z ((30 30 10), (40 40 10))' +
                ')',
            ]);
            verifyResults(input, 'XYM', [
                'GEOMETRYCOLLECTION EMPTY',
                'GEOMETRYCOLLECTION M (' +
                'POINT (10 10), ' +
                'GEOMETRYCOLLECTION M (' +
                'LINESTRING M (10 10 1, 10 20 5, 20 20 7), ' +
                'GEOMETRYCOLLECTION EMPTY' +
                '), ' +
                'MULTIPOINT M ((30 30 10), (40 40 10))' +
                ')',
            ]);
            verifyResults(input, 'XY', [
                'GEOMETRYCOLLECTION EMPTY',
                'GEOMETRYCOLLECTION (' +
                'POINT (10 10), ' +
                'GEOMETRYCOLLECTION (' +
                'LINESTRING (10 10, 10 20, 20 20), ' +
                'GEOMETRYCOLLECTION EMPTY' +
                '), ' +
                'MULTIPOINT ((30 30), (40 40))' +
                ')',
            ]);
        });

        it('should throw if any geometry is invalid', () => {
            const gCollectionWithInvalidGeometry: JSON_Geometry = {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ] ] },
                ],
            };
            assert.throws(() => geosifyGeometry(gCollectionWithInvalidGeometry, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: gCollectionWithInvalidGeometry.geometries[ 0 ],
            });
        });

    });

    describe('CircularString', () => {

        it('should geosify CircularString', () => {
            const input: JSON_Geometry[] = [
                { type: 'CircularString', coordinates: [] },
                { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ], [ 40, 10 ], [ 50, 20 ] ] },
                { type: 'CircularString', coordinates: [ [ 10, 20, 1, 1.1 ], [ 20, 30, 9, 1.2 ], [ 30, 20, 3, 1.3 ] ] },
            ];
            verifyResults(input, 'XYZM', [
                'CIRCULARSTRING EMPTY',
                'CIRCULARSTRING (10 20, 20 30, 30 20, 40 10, 50 20)',
                'CIRCULARSTRING ZM (10 20 1 1.1, 20 30 9 1.2, 30 20 3 1.3)',
            ]);
            verifyResults(input, 'XYZ', [
                'CIRCULARSTRING EMPTY',
                'CIRCULARSTRING (10 20, 20 30, 30 20, 40 10, 50 20)',
                'CIRCULARSTRING Z (10 20 1, 20 30 9, 30 20 3)',
            ]);
            verifyResults(input, 'XYM', [
                'CIRCULARSTRING EMPTY',
                'CIRCULARSTRING (10 20, 20 30, 30 20, 40 10, 50 20)',
                'CIRCULARSTRING M (10 20 1, 20 30 9, 30 20 3)',
            ]);
            verifyResults(input, 'XY', [
                'CIRCULARSTRING EMPTY',
                'CIRCULARSTRING (10 20, 20 30, 30 20, 40 10, 50 20)',
                'CIRCULARSTRING (10 20, 20 30, 30 20)',
            ]);
        });

        it('should throw if there are not enough points', () => {
            const cStringWithOnePosition: JSON_Geometry = {
                type: 'CircularString',
                coordinates: [ [ 10, 20 ] ],
            };
            assert.throws(() => geosifyGeometry(cStringWithOnePosition, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CircularString must have at least one circular arc defined by 3 points',
                details: undefined,
                geometry: cStringWithOnePosition,
            });
            const cStringWithTwoPosition: JSON_Geometry = {
                type: 'CircularString',
                coordinates: [ [ 10, 20 ], [ 20, 30 ] ],
            };
            assert.throws(() => geosifyGeometry(cStringWithTwoPosition, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CircularString must have at least one circular arc defined by 3 points',
                details: undefined,
                geometry: cStringWithTwoPosition,
            });
        });

        it('should throw if it does not have an odd number of points', () => {
            const cStringWithEvenNumberOfPoints: JSON_Geometry = {
                type: 'CircularString',
                coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ], [ 40, 10 ] ],
            };
            assert.throws(() => geosifyFeatures([ {
                type: 'Feature',
                geometry: cStringWithEvenNumberOfPoints,
                properties: null,
            } ], 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CircularString must have and odd number of points',
                details: undefined,
                geometry: cStringWithEvenNumberOfPoints,
            });
        });

    });

    describe('CompoundCurve', () => {

        it('should geosify CompoundCurve', () => {
            const input: JSON_Geometry[] = [
                { type: 'CompoundCurve', segments: [] },
                {
                    type: 'CompoundCurve', segments: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                        { type: 'LineString', coordinates: [ [ 10, 20 ], [ 20, 10 ] ] },
                    ],
                }, {
                    type: 'CompoundCurve', segments: [
                        { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ] ] },
                        {
                            type: 'CircularString',
                            coordinates: [ [ 10, 20, 5, 1.2 ], [ 20, 20, 9, 1.3 ], [ 20, 10, 9, 1.4 ] ],
                        },
                    ],
                }, {
                    type: 'CompoundCurve', segments: [
                        { type: 'CircularString', coordinates: [ [ 10, 10 ], [ 20, 20 ], [ 10, 20 ] ] },
                        { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 10, 30 ], [ 20, 10 ] ] },
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'COMPOUNDCURVE EMPTY',
                'COMPOUNDCURVE ((10 10, 10 20), (10 20, 20 10))',
                'COMPOUNDCURVE ZM ((10 10 1 1.1, 10 20 5 1.2), CIRCULARSTRING ZM (10 20 5 1.2, 20 20 9 1.3, 20 10 9 1.4))',
                'COMPOUNDCURVE (CIRCULARSTRING (10 10, 20 20, 10 20), CIRCULARSTRING (10 20, 10 30, 20 10))',
            ]);
            verifyResults(input, 'XYZ', [
                'COMPOUNDCURVE EMPTY',
                'COMPOUNDCURVE ((10 10, 10 20), (10 20, 20 10))',
                'COMPOUNDCURVE Z ((10 10 1, 10 20 5), CIRCULARSTRING Z (10 20 5, 20 20 9, 20 10 9))',
                'COMPOUNDCURVE (CIRCULARSTRING (10 10, 20 20, 10 20), CIRCULARSTRING (10 20, 10 30, 20 10))',
            ]);
            verifyResults(input, 'XYM', [
                'COMPOUNDCURVE EMPTY',
                'COMPOUNDCURVE ((10 10, 10 20), (10 20, 20 10))',
                'COMPOUNDCURVE M ((10 10 1, 10 20 5), CIRCULARSTRING M (10 20 5, 20 20 9, 20 10 9))',
                'COMPOUNDCURVE (CIRCULARSTRING (10 10, 20 20, 10 20), CIRCULARSTRING (10 20, 10 30, 20 10))',
            ]);
            verifyResults(input, 'XY', [
                'COMPOUNDCURVE EMPTY',
                'COMPOUNDCURVE ((10 10, 10 20), (10 20, 20 10))',
                'COMPOUNDCURVE ((10 10, 10 20), CIRCULARSTRING (10 20, 20 20, 20 10))',
                'COMPOUNDCURVE (CIRCULARSTRING (10 10, 20 20, 10 20), CIRCULARSTRING (10 20, 10 30, 20 10))',
            ]);
        });

        it('should throw if any segment is not LineString or CircularString', () => {
            const cCurveWithInvalidTypeSegment: JSON_Geometry = {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'MultiLineString', coordinates: [ [ [ 10, 20 ], [ 20, 10 ] ] ] } as any,
                ],
            };
            assert.throws(() => geosifyGeometry(cCurveWithInvalidTypeSegment, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CompoundCurve segment must be LineString or CircularString',
                details: '"MultiLineString" is not allowed',
                geometry: cCurveWithInvalidTypeSegment,
            });
        });

        it('should throw if any segment is empty', () => {
            const cCurveWithOnlyOneEmptySegment: JSON_Geometry = {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [] },
                ],
            };
            assert.throws(() => geosifyGeometry(cCurveWithOnlyOneEmptySegment, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CompoundCurve cannot contain empty segments',
                details: undefined,
                geometry: cCurveWithOnlyOneEmptySegment,
            });
            const cCurveWithEmptySegment: JSON_Geometry = {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'LineString', coordinates: [] }, // empty segment
                    { type: 'LineString', coordinates: [ [ 10, 20 ], [ 20, 10 ] ] },
                ],
            };
            assert.throws(() => geosifyGeometry(cCurveWithEmptySegment, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CompoundCurve cannot contain empty segments',
                details: undefined,
                geometry: cCurveWithEmptySegment,
            });
        });

        it('should throw if segments are not continuous', () => {
            const cCurveWithNoContinuousSegments: JSON_Geometry = {
                type: 'CompoundCurve',
                segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10, 1 ], [ 10, 20, 5 ] ] },
                    { type: 'LineString', coordinates: [ [ 10, 20, 7 ], [ 20, 10, 9 ] ] }, // not continuous, Z differ
                ],
            };
            assert.throws(() => geosifyFeatures([ {
                type: 'Feature',
                geometry: cCurveWithNoContinuousSegments,
                properties: null,
            } ], 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CompoundCurve segments must be continuous',
                details: 'points [10,20,5] and [10,20,7] are not equal',
                geometry: cCurveWithNoContinuousSegments,
            });
        });

    });

    describe('CurvePolygon', () => {

        it('should geosify CurvePolygon', () => {
            const input: JSON_Geometry[] = [
                { type: 'CurvePolygon', rings: [] },
                {
                    type: 'CurvePolygon', rings: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 80 ], [ 80, 10 ], [ 10, 10 ] ] },
                        { type: 'LineString', coordinates: [] }, // empty ring
                        { type: 'CircularString', coordinates: [] }, // empty ring
                    ],
                }, {
                    type: 'CurvePolygon', rings: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 80 ], [ 80, 10 ], [ 10, 10 ] ] },
                        {
                            type: 'CircularString',
                            coordinates: [ [ 20, 30 ], [ 30, 20 ], [ 40, 30 ], [ 30, 40 ], [ 20, 30 ] ],
                        },
                    ],
                }, {
                    type: 'CurvePolygon', rings: [
                        {
                            type: 'CompoundCurve', segments: [
                                { type: 'LineString', coordinates: [ [ 10, 80, 5, 1.1 ], [ 80, 10, 7, 1.2 ] ] },
                                {
                                    type: 'CircularString',
                                    coordinates: [ [ 80, 10, 7, 1.2 ], [ 10, 10, 3, 1.3 ], [ 10, 80, 5, 1.1 ] ],
                                },
                            ],
                        },
                        {
                            type: 'LineString',
                            coordinates: [ [ 30, 40, 2, 2.1 ], [ 20, 20, 8, 2.2 ], [ 40, 30, 4, 2.3 ], [ 30, 40, 2, 2.1 ] ],
                        },
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'CURVEPOLYGON EMPTY',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), EMPTY, CIRCULARSTRING EMPTY)',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30))',
                'CURVEPOLYGON ZM (COMPOUNDCURVE ZM ((10 80 5 1.1, 80 10 7 1.2), CIRCULARSTRING ZM (80 10 7 1.2, 10 10 3 1.3, 10 80 5 1.1)), (30 40 2 2.1, 20 20 8 2.2, 40 30 4 2.3, 30 40 2 2.1))',
            ]);
            verifyResults(input, 'XYZ', [
                'CURVEPOLYGON EMPTY',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), EMPTY, CIRCULARSTRING EMPTY)',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30))',
                'CURVEPOLYGON Z (COMPOUNDCURVE Z ((10 80 5, 80 10 7), CIRCULARSTRING Z (80 10 7, 10 10 3, 10 80 5)), (30 40 2, 20 20 8, 40 30 4, 30 40 2))',
            ]);
            verifyResults(input, 'XYM', [
                'CURVEPOLYGON EMPTY',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), EMPTY, CIRCULARSTRING EMPTY)',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30))',
                'CURVEPOLYGON M (COMPOUNDCURVE M ((10 80 5, 80 10 7), CIRCULARSTRING M (80 10 7, 10 10 3, 10 80 5)), (30 40 2, 20 20 8, 40 30 4, 30 40 2))',
            ]);
            verifyResults(input, 'XY', [
                'CURVEPOLYGON EMPTY',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), EMPTY, CIRCULARSTRING EMPTY)',
                'CURVEPOLYGON ((10 10, 10 80, 80 10, 10 10), CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30))',
                'CURVEPOLYGON (COMPOUNDCURVE ((10 80, 80 10), CIRCULARSTRING (80 10, 10 10, 10 80)), (30 40, 20 20, 40 30, 30 40))',
            ]);
        });

        it('should throw if any ring is not LineString, CircularString or CompoundCurve', () => {
            const cPolyWithInvalidTypeRing: JSON_Geometry = {
                type: 'CurvePolygon', rings: [
                    {
                        type: 'MultiLineString',
                        coordinates: [ [ [ 10, 10 ], [ 10, 80 ] ], [ [ 80, 10 ], [ 10, 10 ] ] ],
                    } as any,
                ],
            };
            assert.throws(() => geosifyGeometry(cPolyWithInvalidTypeRing, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CurvePolygon ring must be LineString, CircularString or CompoundCurve',
                details: '"MultiLineString" is not allowed',
                geometry: cPolyWithInvalidTypeRing,
            });
        });

        it('should throw if any ring is not closed', () => {
            const cPolyWithNotClosedLinearRing: JSON_Geometry = {
                type: 'CurvePolygon', rings: [ {
                    type: 'LineString',
                    coordinates: [ [ 20, 10 ], [ 10, 80 ], [ 80, 10 ], [ 10, 20 ] ],
                } ],
            };
            assert.throws(() => geosifyGeometry(cPolyWithNotClosedLinearRing, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CurvePolygon ring must be closed',
                details: 'points [20,10] and [10,20] are not equal',
                geometry: cPolyWithNotClosedLinearRing,
            });
            const cPolyWithNotClosedCircularRing: JSON_Geometry = {
                type: 'CurvePolygon', rings: [ {
                    type: 'CircularString',
                    coordinates: [ [ 10, 15 ], [ 20, 30 ], [ 30, 20 ], [ 20, 10 ], [ 10, 25 ] ],
                } ],
            };
            assert.throws(() => geosifyGeometry(cPolyWithNotClosedCircularRing, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CurvePolygon ring must be closed',
                details: 'points [10,15] and [10,25] are not equal',
                geometry: cPolyWithNotClosedCircularRing,
            });
            const cPolyWithNotClosedCompoundRing: JSON_Geometry = {
                type: 'CurvePolygon', rings: [ {
                    type: 'CompoundCurve', segments: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
                        { type: 'CircularString', coordinates: [ [ 20, 20 ], [ 20, 10 ], [ 15, 10 ] ] },
                    ],
                } ],
            };
            assert.throws(() => geosifyGeometry(cPolyWithNotClosedCompoundRing, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CurvePolygon ring must be closed',
                details: 'points [10,10] and [15,10] are not equal',
                geometry: cPolyWithNotClosedCompoundRing,
            });
        });

    });

    describe('MultiCurve', () => {

        it('should geosify MultiCurve', () => {
            const input: JSON_Geometry[] = [
                { type: 'MultiCurve', curves: [] },
                {
                    type: 'MultiCurve', curves: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ], [ 20, 20 ] ] },
                        { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ], [ 30, 20 ] ] },
                        { type: 'LineString', coordinates: [] },
                        { type: 'CircularString', coordinates: [] },
                        { type: 'CompoundCurve', segments: [] },
                    ],
                }, {
                    type: 'MultiCurve', curves: [
                        {
                            type: 'LineString',
                            coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ], [ 20, 20, 7, 1.3 ] ],
                        }, {
                            type: 'CircularString',
                            coordinates: [ [ 10, 20, 1, 1.1 ], [ 20, 30, 9, 1.2 ], [ 30, 20, 3, 1.3 ] ],
                        }, {
                            type: 'CompoundCurve', segments: [
                                { type: 'LineString', coordinates: [ [ 10, 10, 1, 1.1 ], [ 10, 20, 5, 1.2 ] ] },
                                {
                                    type: 'CircularString',
                                    coordinates: [ [ 10, 20, 5, 1.2 ], [ 20, 20, 9, 1.3 ], [ 20, 10, 9, 1.4 ] ],
                                },
                            ],
                        },
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'MULTICURVE EMPTY',
                'MULTICURVE ((10 10, 10 20, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20), EMPTY, CIRCULARSTRING EMPTY, COMPOUNDCURVE EMPTY)',
                'MULTICURVE ZM ((10 10 1 1.1, 10 20 5 1.2, 20 20 7 1.3), CIRCULARSTRING ZM (10 20 1 1.1, 20 30 9 1.2, 30 20 3 1.3), COMPOUNDCURVE ZM ((10 10 1 1.1, 10 20 5 1.2), CIRCULARSTRING ZM (10 20 5 1.2, 20 20 9 1.3, 20 10 9 1.4)))',
            ]);
            verifyResults(input, 'XYZ', [
                'MULTICURVE EMPTY',
                'MULTICURVE ((10 10, 10 20, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20), EMPTY, CIRCULARSTRING EMPTY, COMPOUNDCURVE EMPTY)',
                'MULTICURVE Z ((10 10 1, 10 20 5, 20 20 7), CIRCULARSTRING Z (10 20 1, 20 30 9, 30 20 3), COMPOUNDCURVE Z ((10 10 1, 10 20 5), CIRCULARSTRING Z (10 20 5, 20 20 9, 20 10 9)))',
            ]);
            verifyResults(input, 'XYM', [
                'MULTICURVE EMPTY',
                'MULTICURVE ((10 10, 10 20, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20), EMPTY, CIRCULARSTRING EMPTY, COMPOUNDCURVE EMPTY)',
                'MULTICURVE M ((10 10 1, 10 20 5, 20 20 7), CIRCULARSTRING M (10 20 1, 20 30 9, 30 20 3), COMPOUNDCURVE M ((10 10 1, 10 20 5), CIRCULARSTRING M (10 20 5, 20 20 9, 20 10 9)))',
            ]);
            verifyResults(input, 'XY', [
                'MULTICURVE EMPTY',
                'MULTICURVE ((10 10, 10 20, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20), EMPTY, CIRCULARSTRING EMPTY, COMPOUNDCURVE EMPTY)',
                'MULTICURVE ((10 10, 10 20, 20 20), CIRCULARSTRING (10 20, 20 30, 30 20), COMPOUNDCURVE ((10 10, 10 20), CIRCULARSTRING (10 20, 20 20, 20 10)))',
            ]);
        });

        it('should throw if any curve is not LineString, CircularString or CompoundCurve', () => {
            const mCurveWithInvalidTypeComponent: JSON_Geometry = {
                type: 'MultiCurve', curves: [
                    { type: 'MultiLineString', coordinates: [ [ [ 10, 10 ], [ 20, 20 ] ] ] } as any,
                ],
            };
            assert.throws(() => geosifyGeometry(mCurveWithInvalidTypeComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'MultiCurve component must be LineString, CircularString or CompoundCurve',
                details: '"MultiLineString" is not allowed',
                geometry: mCurveWithInvalidTypeComponent,
            });
        });

        it('should throw if any curve is invalid', () => {
            const mCurveWithInvalidLinearComponent: JSON_Geometry = {
                type: 'MultiCurve', curves: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ] ] },
                ],
            };
            assert.throws(() => geosifyGeometry(mCurveWithInvalidLinearComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'LineString must have at leat 2 points',
                details: 'found 1',
                geometry: mCurveWithInvalidLinearComponent.curves[ 0 ],
            });
            const mCurveWithInvalidCircularComponent: JSON_Geometry = {
                type: 'MultiCurve', curves: [
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 30 ] ] },
                ],
            };
            assert.throws(() => geosifyGeometry(mCurveWithInvalidCircularComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CircularString must have at least one circular arc defined by 3 points',
                details: undefined,
                geometry: mCurveWithInvalidCircularComponent.curves[ 0 ],
            });
            const mCurveWithInvalidCompoundComponent: JSON_Geometry = {
                type: 'MultiCurve', curves: [
                    { type: 'CompoundCurve', segments: [ { type: 'LineString', coordinates: [] } ] },
                ],
            };
            assert.throws(() => geosifyGeometry(mCurveWithInvalidCompoundComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CompoundCurve cannot contain empty segments',
                details: undefined,
                geometry: mCurveWithInvalidCompoundComponent.curves[ 0 ],
            });
        });

    });

    describe('MultiSurface', () => {

        it('should geosify MultiSurface', () => {
            const input: JSON_Geometry[] = [
                { type: 'MultiSurface', surfaces: [] },
                {
                    type: 'MultiSurface', surfaces: [
                        {
                            type: 'Polygon', coordinates: [
                                [ [ 10, 10 ], [ 10, 60 ], [ 60, 60 ], [ 60, 10 ], [ 10, 10 ] ],
                            ],
                        },
                        {
                            type: 'CurvePolygon', rings: [
                                {
                                    type: 'CircularString',
                                    coordinates: [ [ 20, 30 ], [ 30, 20 ], [ 40, 30 ], [ 30, 40 ], [ 20, 30 ] ],
                                },
                            ],
                        },
                        { type: 'Polygon', coordinates: [] },
                        { type: 'CurvePolygon', rings: [] },
                    ],
                }, {
                    type: 'MultiSurface', surfaces: [
                        {
                            type: 'Polygon', coordinates: [
                                [ [ 10, 10, 7, 1.1 ], [ 10, 60, 5, 1.2 ], [ 60, 10, 5, 1.3 ], [ 10, 10, 7, 1.1 ] ],
                                [ [ 20, 20, 8, 2.1 ], [ 30, 20, 6, 2.2 ], [ 20, 30, 6, 2.3 ], [ 20, 20, 8, 2.1 ] ],
                            ],
                        }, {
                            type: 'CurvePolygon', rings: [
                                {
                                    type: 'CompoundCurve', segments: [
                                        { type: 'LineString', coordinates: [ [ 10, 80, 5, 1.1 ], [ 80, 10, 7, 1.2 ] ] },
                                        {
                                            type: 'CircularString',
                                            coordinates: [ [ 80, 10, 7, 1.2 ], [ 10, 10, 3, 1.3 ], [ 10, 80, 5, 1.1 ] ],
                                        },
                                    ],
                                },
                                {
                                    type: 'LineString',
                                    coordinates: [ [ 30, 40, 2, 2.1 ], [ 20, 20, 8, 2.2 ], [ 40, 30, 4, 2.3 ], [ 30, 40, 2, 2.1 ] ],
                                },
                            ],
                        },
                    ],
                },
            ];
            verifyResults(input, 'XYZM', [
                'MULTISURFACE EMPTY',
                'MULTISURFACE (((10 10, 10 60, 60 60, 60 10, 10 10)), CURVEPOLYGON (CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30)), EMPTY, CURVEPOLYGON EMPTY)',
                'MULTISURFACE ZM (((10 10 7 1.1, 10 60 5 1.2, 60 10 5 1.3, 10 10 7 1.1), (20 20 8 2.1, 30 20 6 2.2, 20 30 6 2.3, 20 20 8 2.1)), CURVEPOLYGON ZM (COMPOUNDCURVE ZM ((10 80 5 1.1, 80 10 7 1.2), CIRCULARSTRING ZM (80 10 7 1.2, 10 10 3 1.3, 10 80 5 1.1)), (30 40 2 2.1, 20 20 8 2.2, 40 30 4 2.3, 30 40 2 2.1)))',
            ]);
            verifyResults(input, 'XYZ', [
                'MULTISURFACE EMPTY',
                'MULTISURFACE (((10 10, 10 60, 60 60, 60 10, 10 10)), CURVEPOLYGON (CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30)), EMPTY, CURVEPOLYGON EMPTY)',
                'MULTISURFACE Z (((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8)), CURVEPOLYGON Z (COMPOUNDCURVE Z ((10 80 5, 80 10 7), CIRCULARSTRING Z (80 10 7, 10 10 3, 10 80 5)), (30 40 2, 20 20 8, 40 30 4, 30 40 2)))',
            ]);
            verifyResults(input, 'XYM', [
                'MULTISURFACE EMPTY',
                'MULTISURFACE (((10 10, 10 60, 60 60, 60 10, 10 10)), CURVEPOLYGON (CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30)), EMPTY, CURVEPOLYGON EMPTY)',
                'MULTISURFACE M (((10 10 7, 10 60 5, 60 10 5, 10 10 7), (20 20 8, 30 20 6, 20 30 6, 20 20 8)), CURVEPOLYGON M (COMPOUNDCURVE M ((10 80 5, 80 10 7), CIRCULARSTRING M (80 10 7, 10 10 3, 10 80 5)), (30 40 2, 20 20 8, 40 30 4, 30 40 2)))',
            ]);
            verifyResults(input, 'XY', [
                'MULTISURFACE EMPTY',
                'MULTISURFACE (((10 10, 10 60, 60 60, 60 10, 10 10)), CURVEPOLYGON (CIRCULARSTRING (20 30, 30 20, 40 30, 30 40, 20 30)), EMPTY, CURVEPOLYGON EMPTY)',
                'MULTISURFACE (((10 10, 10 60, 60 10, 10 10), (20 20, 30 20, 20 30, 20 20)), CURVEPOLYGON (COMPOUNDCURVE ((10 80, 80 10), CIRCULARSTRING (80 10, 10 10, 10 80)), (30 40, 20 20, 40 30, 30 40)))',
            ]);
        });

        it('should throw if any surface is not Polygon or CurvePolygon', () => {
            const mSurfaceWithInvalidTypeComponent: JSON_Geometry = {
                type: 'MultiSurface', surfaces: [
                    { type: 'MultiPolygon', coordinates: [] } as any,
                ],
            };
            assert.throws(() => geosifyGeometry(mSurfaceWithInvalidTypeComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'MultiSurface component must be Polygon or CurvePolygon',
                details: '"MultiPolygon" is not allowed',
                geometry: mSurfaceWithInvalidTypeComponent,
            });
        });

        it('should throw if any surface is invalid', () => {
            const mSurfaceWithInvalidLinearComponent: JSON_Geometry = {
                type: 'MultiSurface', surfaces: [
                    { type: 'Polygon', coordinates: [ [ [ 10, 10 ], [ 10, 20 ] ] ] },
                ],
            };
            assert.throws(() => geosifyGeometry(mSurfaceWithInvalidLinearComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'Polygon ring must have at leat 3 points',
                details: 'found 2',
                geometry: mSurfaceWithInvalidLinearComponent.surfaces[ 0 ],
            });
            const mSurfaceWithInvalidCurvedComponent: JSON_Geometry = {
                type: 'MultiSurface', surfaces: [ {
                    type: 'CurvePolygon', rings: [
                        { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    ],
                } ],
            };
            assert.throws(() => geosifyGeometry(mSurfaceWithInvalidCurvedComponent, 'XYZM'), {
                name: 'InvalidGeoJSONError',
                message: 'CurvePolygon ring must be closed',
                details: 'points [10,10] and [10,20] are not equal',
                geometry: mSurfaceWithInvalidCurvedComponent.surfaces[ 0 ],
            });
        });

    });


    it('should throw on invalid GeoJSON geometry', () => {
        // feature instead of geometry
        const feature: any = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ 1, 1 ] },
            properties: null,
        };
        assert.throws(() => geosifyGeometry(feature as any, 'XYZM'), {
            name: 'InvalidGeoJSONError',
            message: 'Invalid geometry',
            details: undefined,
            geometry: feature,
        });

        // geometry instead of feature
        const geometry: any = { type: 'Point', coordinates: [ 1, 1 ] };
        assert.throws(() => geosifyFeatures([ geometry ], 'XYZM'), {
            name: 'InvalidGeoJSONError',
            message: 'Invalid geometry',
            details: undefined,
            geometry: undefined,
        });

        // feature with `null` geometry
        const featureWithoutGeometry: any = {
            type: 'Feature',
            geometry: null!,
            properties: null,
        };
        assert.throws(() => geosifyFeatures([ featureWithoutGeometry ], 'XYZM'), {
            name: 'InvalidGeoJSONError',
            message: 'Invalid geometry',
            details: undefined,
            geometry: null,
        });
    });

    it('should create geometries with correct bounds', () => {
        // GEOS calculates envelope on geometry creation
        assert.deepEqual(
            bounds(geosifyGeometry({ type: 'Point', coordinates: [ 1, 1 ] }, 'XYZM')),
            [ 1, 1, 1, 1 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({ type: 'LineString', coordinates: [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ] ] }, 'XYZM')),
            [ 0, -1, 4, 1 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'Polygon',
                coordinates: [ [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ], [ 1, 1 ] ] ],
            }, 'XYZM')),
            [ 0, -1, 4, 1 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({ type: 'MultiPoint', coordinates: [ [ 1, 1 ], [ 2, 1 ] ] }, 'XYZM')),
            [ 1, 1, 2, 1 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'MultiLineString',
                coordinates: [ [ [ 1, 1 ], [ 4, 0 ], [ 0, -1 ] ], [ [ 1, 4 ], [ 2, 2 ] ] ],
            }, 'XYZM')),
            [ 0, -1, 4, 4 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'MultiPolygon',
                coordinates: [
                    [ [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, 0 ] ] ],
                    [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 2, 2 ] ] ],
                ],
            }, 'XYZM')),
            [ 0, 0, 3, 3 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [ 1, 1 ] },
                    { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] },
                    { type: 'Polygon', coordinates: [ [ [ 2, 2 ], [ 2, 3 ], [ 3, 3 ], [ 2, 2 ] ] ] },
                ],
            }, 'XYZM')),
            [ 0, 0, 3, 3 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'CircularString',
                coordinates: [ [ 10, 20 ], [ 15, 30 ], [ 40, 20 ] ],
            }, 'XYZM')),
            [ 10, 20, 40, 33.80199322349037 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'CompoundCurve', segments: [
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 10, 20 ] ] },
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 20, 20 ], [ 20, 10 ] ] },
                ],
            }, 'XYZM')),
            [ 10, 10, 22.071067811865476, 22.071067811865476 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'CurvePolygon',
                rings: [ {
                    type: 'CompoundCurve',
                    segments: [
                        { type: 'LineString', coordinates: [ [ 10, 80 ], [ 80, 10 ] ] },
                        { type: 'CircularString', coordinates: [ [ 80, 10 ], [ 10, 10 ], [ 10, 80 ] ] },
                    ],
                }, {
                    type: 'LineString',
                    coordinates: [ [ 30, 40 ], [ 20, 20 ], [ 40, 30 ], [ 30, 40 ] ],
                } ],
            }, 'XYZM')),
            [ -4.4974746830583285, -4.4974746830583285, 80, 80 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'MultiCurve',
                curves: [
                    { type: 'CircularString', coordinates: [ [ 10, 20 ], [ 15, 30 ], [ 40, 20 ] ] },
                    { type: 'LineString', coordinates: [ [ 10, 10 ], [ 50, 30 ], [ 10, 20 ] ] },
                ],
            }, 'XYZM')),
            [ 10, 10, 50, 33.80199322349037 ],
        );
        assert.deepEqual(
            bounds(geosifyGeometry({
                type: 'MultiSurface',
                surfaces: [
                    { type: 'Polygon', coordinates: [ [ [ -5, 0 ], [ -10, 20 ], [ 20, -2 ], [ -5, 0 ] ] ] },
                    {
                        type: 'CurvePolygon',
                        rings: [ {
                            type: 'CompoundCurve',
                            segments: [
                                { type: 'LineString', coordinates: [ [ 10, 80 ], [ 80, 10 ] ] },
                                { type: 'CircularString', coordinates: [ [ 80, 10 ], [ 10, 10 ], [ 10, 80 ] ] },
                            ],
                        }, {
                            type: 'LineString',
                            coordinates: [ [ 30, 40 ], [ 20, 20 ], [ 40, 30 ], [ 30, 40 ] ],
                        } ],
                    },
                ],
            }, 'XYZM')),
            [ -10, -4.4974746830583285, 80, 80 ],
        );
    });

    it('should create tmp buffer when default one is too small', () => {
        const malloc = mock.method(geos, 'malloc');
        const free = mock.method(geos, 'free');

        geosifyFeatures([ {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ Math.random(), Math.random() ] },
            properties: null,
        } ], 'XYZM');

        assert.equal(malloc.mock.callCount(), 0);
        assert.equal(free.mock.callCount(), 0);

        geosifyFeatures(Array.from({ length: 1000 }, () => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ Math.random(), Math.random() ] },
            properties: null,
        })), 'XYZM');

        assert.equal(malloc.mock.callCount(), 1);
        const mallocCall = malloc.mock.calls[ 0 ];
        assert.deepEqual(mallocCall.arguments, [ 20012 ]); // (buffer meta) 8 + (headers) 1000*4 + (coords) 1000*2*8 + 4 bytes for optional alignment
        assert.equal(free.mock.callCount(), 1);
        const freeCall = free.mock.calls[ 0 ];
        assert.deepEqual(freeCall.arguments, [ mallocCall.result ]);

        geosifyFeatures(Array.from({ length: 1000 }, () => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ Math.random(), Math.random(), Math.random() ] },
            properties: null,
        })), 'XYZM');

        assert.equal(malloc.mock.callCount(), 2);
        const mallocCall2 = malloc.mock.calls[ 1 ];
        assert.deepEqual(mallocCall2.arguments, [ 28012 ]); // (buffer meta) 8 + (headers) 1000*4 + (coords) 1000*3*8 + 4 bytes for optional alignment
        assert.equal(free.mock.callCount(), 2);
        const freeCall2 = free.mock.calls[ 1 ];
        assert.deepEqual(freeCall2.arguments, [ mallocCall2.result ]);
    });

});
