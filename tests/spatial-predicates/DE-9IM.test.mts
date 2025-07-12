import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { prepare } from '../../src/geom/PreparedGeometry.mjs';
import { geometryCollection, lineString, multiLineString, multiPoint, multiPolygon, point, polygon } from '../../src/helpers/helpers.mjs';
import { equals } from '../../src/spatial-predicates/equals.mjs';
import { disjoint, intersects } from '../../src/spatial-predicates/intersects.mjs';
import { contains, containsProperly, within } from '../../src/spatial-predicates/contains.mjs';
import { coveredBy, covers } from '../../src/spatial-predicates/covers.mjs';
import { crosses } from '../../src/spatial-predicates/crosses.mjs';
import { overlaps } from '../../src/spatial-predicates/overlaps.mjs';
import { touches } from '../../src/spatial-predicates/touches.mjs';
import { relate, relatePattern } from '../../src/spatial-predicates/relate.mjs';
import { isPrepared } from '../../src/predicates/isPrepared.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('DE-9IM', () => {

    interface Relations {
        equals: boolean;
        intersects: boolean;
        disjoint: boolean;
        contains: boolean;
        containsProperly: boolean;
        within: boolean;
        covers: boolean;
        coveredBy: boolean;
        crosses: boolean;
        overlaps: boolean;
        touches: boolean;
        relate: string;
    }

    let expectedRelations: Relations;
    let a: Geometry, b: Geometry;

    function getRelations(a: Geometry, b: Geometry): Relations {
        return {
            equals: equals(a, b),
            intersects: intersects(a, b),
            disjoint: disjoint(a, b),
            contains: contains(a, b),
            containsProperly: containsProperly(isPrepared(a) ? a : a.clone(), b),
            within: within(a, b),
            covers: covers(a, b),
            coveredBy: coveredBy(a, b),
            crosses: crosses(a, b),
            overlaps: overlaps(a, b),
            touches: touches(a, b),
            relate: relate(a, b),
        };
    }

    before(async () => {
        await initializeForTest();
    });

    describe('Point - Point', () => {

        it('equals', () => {
            expectedRelations = {
                equals: true,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: true,
                covers: true,
                coveredBy: true,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '0FFFFFFF2',
            };

            a = point([ 10, 10 ]);
            b = point([ 10, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPoint([ [ 10, 10 ] ]);
            b = multiPoint([ [ 10, 10 ], [ 10, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPoint([ [ 10, 10 ], [ 20, 10 ], [ 30, 10 ] ]);
            b = multiPoint([ [ 30, 10 ], [ 10, 10 ], [ 20, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF0FFF0F2',
            };

            a = point([ 10, 10 ]);
            b = point([ 20, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = point([ 10, 10 ]);
            b = multiPoint([ [ 20, 10 ], [ 30, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = point([ 10, 10 ]);
            b = multiPoint([ [ 20, 10 ], [ 30, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('overlaps', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: true,
                touches: false,
                relate: '0F0FFF0F2',
            };

            a = multiPoint([ [ 10, 10 ], [ 20, 10 ], [ 30, 10 ] ]);
            b = multiPoint([ [ -10, 10 ], [ 20, 10 ], [ 30, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

    });

    describe('Line - Point', () => {

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF1FF00F2',
            };

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = point([ 0, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('contains/covers', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '0F1FF0FF2',
            };

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = point([ 15, 15 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = multiPoint([ [ 10, 10 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '0F10F0FF2', containsProperly: false });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '0F10F0FF2', containsProperly: false });
        });

        it('crosses', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '0F1FF00F2',
            };

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = multiPoint([ [ 20, 20 ], [ 20, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('touches', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF10F0FF2',
            };

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = point([ 10, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = multiPoint([ [ 10, 10 ], [ 20, 10 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, covers: false, relate: 'FF10F00F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, covers: false, relate: 'FF10F00F2' });
        });

    });

    describe('Line - Line', () => {

        it('equals', () => {
            expectedRelations = {
                equals: true,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: false,
                within: true,
                covers: true,
                coveredBy: true,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '1FFF0FFF2',
            };

            a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
            b = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
            b = lineString([ [ 8, 0 ], [ 0, 0 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
            b = multiLineString([
                [ [ 0, 0 ], [ 5, 0 ] ],
                [ [ 8, 0 ], [ 5, 0 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
            b = multiLineString([
                [ [ 0, 0 ], [ 5, 0 ] ],
                [ [ 8, 0 ], [ 3, 0 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '10FF0FFF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '10FF0FFF2' });

            // ring
            a = lineString([ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ]);
            b = lineString([ [ 50, 50 ], [ 10, 50 ], [ 10, 10 ], [ 50, 10 ], [ 50, 50 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '1FFFFFFF2', containsProperly: true });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '1FFFFFFF2', containsProperly: true });

            // self intersection
            a = lineString([ [ 10, 10 ], [ 50, 50 ], [ 50, 10 ], [ 10, 50 ] ]);
            b = multiLineString([
                [ [ 10, 10 ], [ 30, 30 ] ],
                [ [ 30, 30 ], [ 50, 50 ], [ 50, 10 ], [ 30, 30 ] ],
                [ [ 30, 30 ], [ 10, 50 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF1FF0102',
            };

            a = lineString([ [ 10, 10 ], [ 20, 10 ] ]);
            b = lineString([ [ 10, 20 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 10, 10 ], [ 20, 20 ], [ 40, 20 ] ]);
            b = lineString([ [ 12, 10 ], [ 21, 19 ], [ 40, 19 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            // ring
            a = lineString([ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ]);
            b = lineString([ [ 20, 20 ], [ 40, 40 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF1FFF102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF1FFF102' });

            // ring
            a = lineString([ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ]);
            b = lineString([ [ 20, 20 ], [ 20, 40 ], [ 40, 40 ], [ 40, 20 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF1FFF1F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF1FFF1F2' });
        });

        it('contains/covers', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '101FF0FF2',
            };

            a = lineString([ [ -10, 0 ], [ 30, 20 ], [ 40, 10 ], [ 80, 30 ] ]);
            b = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ -10, 0 ], [ 30, 20 ], [ 40, 10 ], [ 80, 30 ] ]);
            b = multiLineString([
                [ [ 10, 10 ], [ 30, 20 ] ],
                [ [ 40, 10 ], [ 60, 20 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('crosses', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '0F1FF0102',
            };

            a = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            b = lineString([ [ 30, 0 ], [ 40, 30 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            b = lineString([ [ 30, 0 ], [ 30, 40 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('overlaps', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: true,
                touches: false,
                relate: '1F1FF0102',
            };

            a = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            b = lineString([ [ 10, 40 ], [ 50, 0 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            b = lineString([ [ 10, 40 ], [ 40, 10 ], [ 80, 30 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '1F10F0102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '1F10F0102' });

            a = lineString([ [ 10, 10 ], [ 30, 20 ], [ 40, 10 ], [ 60, 20 ] ]);
            b = lineString([ [ 10, 40 ], [ 40, 10 ], [ 50, 15 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '101FF0102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '101FF0102' });
        });

        it('touches', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF1F00102',
            };

            a = lineString([ [ 0, 0 ], [ 10, 10 ] ]);
            b = lineString([ [ 0, 10 ], [ 10, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = lineString([ [ 0, 0 ], [ 10, 10 ] ]);
            b = lineString([ [ 0, 20 ], [ 20, 0 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF10F0102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF10F0102' });

            // form a ring
            a = lineString([ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ] ]);
            b = lineString([ [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF1F0F1F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF1F0F1F2' });
        });

    });

    describe('Area - Point', () => {

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF2FF10F2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = point([ 60, 60 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            // inside polygon hole
            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = point([ 35, 35 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('point in area interior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '0F2FF1FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = point([ 40, 40 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = point([ 40, 40 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = geometryCollection([
                polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]),
                polygon([ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ]),
            ]);
            b = point([ 40, 40 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('point in area boundary', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF20F1FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = point([ 10, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = point([ 15, 10 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPoint([ [ 10, 10 ], [ 50, 50 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = point([ 30, 30 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = point([ 30, 35 ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiPoint([ [ 50, 30 ], [ 60, 30 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('points in area interior and boundary', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: false,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '0F20F1FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPoint([ [ 10, 10 ], [ 40, 40 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            // one point in one polygon interior, second on the second polygon boundary
            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiPoint([ [ 40, 40 ], [ 60, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('points in area interior and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '0F2FF10F2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPoint([ [ 20, 20 ], [ 60, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiPoint([ [ 40, 40 ], [ 100, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('points in area boundary and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF20F10F2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPoint([ [ 10, 10 ], [ 60, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiPoint([ [ 10, 10 ], [ 100, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('points in area interior and boundary and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '0F20F10F2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPoint([ [ 10, 10 ], [ 30, 30 ], [ 60, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiPoint([ [ 10, 10 ], [ 80, 50 ], [ 100, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

    });

    describe('Area - Line', () => {

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF2FF1102',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 60, 60 ], [ 60, 0 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            // inside polygon hole
            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = lineString([ [ 31, 31 ], [ 39, 31 ], [ 39, 39 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('line in area interior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '102FF1FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 20, 20 ], [ 40, 40 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 20, 20 ], [ 20, 40 ], [ 40, 40 ], [ 40, 20 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '1F2FF1FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '1F2FF1FF2' });

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiLineString([
                [ [ 20, 20 ], [ 20, 40 ], [ 40, 40 ] ],
                [ [ 40, 40 ], [ 40, 20 ], [ 20, 20 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '1F2FF1FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '1F2FF1FF2' });
        });

        it('line in area boundary', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF21FFFF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 50, 50 ], [ 10, 50 ], [ 10, 10 ], [ 50, 10 ], [ 50, 50 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiLineString([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ] ],
                [ [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiLineString([
                [ [ 10, 10 ], [ 10, 50 ] ],
                [ [ 50, 50 ], [ 50, 10 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF2101FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF2101FF2' });

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiLineString([
                [ [ 10, 10 ], [ 10, 50 ] ],
                [ [ 100, 70 ], [ 100, 30 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF2101FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF2101FF2' });
        });

        it('line in area interior and boundary', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: false,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '102F01FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 10 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiLineString([
                [ [ 20, 20 ], [ 40, 40 ] ], // inside first polygon
                [ [ 60, 40 ], [ 60, 60 ] ], // at second polygon boundary
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '102101FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '102101FF2' });

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 10 ], [ 20, 20 ], [ 20, 40 ], [ 50, 50 ], [ 40, 20 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '102001FF2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '102001FF2' });
        });

        it('line in area interior and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '1020F1102',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 0, 0 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiLineString([
                [ [ 20, 20 ], [ 40, 40 ] ], // inside first polygon
                [ [ 60, 10 ], [ 100, 10 ] ], // outside
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '102FF1102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '102FF1102' });

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 10 ], [ 20, 20 ], [ 20, 40 ], [ 60, 60 ], [ 40, 20 ], [ 20, 20 ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '1020011F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '1020011F2' });
        });

        it('line in area boundary and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF21F1102',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 0 ], [ 10, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiLineString([
                [ [ 10, 50 ], [ 50, 50 ] ], // at first polygon boundary
                [ [ 60, 10 ], [ 100, 10 ] ], // outside
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF2101102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF2101102' });
        });

        it('line in area boundary and boundary and exterior', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: true,
                overlaps: false,
                touches: false,
                relate: '1F21F1102',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = lineString([ [ 10, 0 ], [ 10, 10 ], [ 50, 10 ], [ 10, 60 ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = multiLineString([
                [ [ 10, 50 ], [ 50, 50 ] ], // at first polygon boundary
                [ [ 20, 30 ], [ 40, 30 ] ], // inside first polygon
                [ [ 60, 10 ], [ 100, 10 ] ], // outside
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '102101102' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '102101102' });
        });

    });

    describe('Area - Area', () => {

        it('equals', () => {
            expectedRelations = {
                equals: true,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: false,
                within: true,
                covers: true,
                coveredBy: true,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '2FFF1FFF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 50, 50 ], [ 50, 10 ], [ 10, 10 ], [ 10, 50 ], [ 50, 50 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = geometryCollection([
                polygon([ [ [ 10, 10 ], [ 20, 40 ], [ 50, 10 ], [ 10, 10 ] ] ]),
                polygon([ [ [ 50, 10 ], [ 20, 40 ], [ 50, 50 ], [ 50, 10 ] ] ]),
                polygon([ [ [ 50, 50 ], [ 20, 40 ], [ 10, 50 ], [ 50, 50 ] ] ]),
                polygon([ [ [ 10, 50 ], [ 20, 40 ], [ 10, 10 ], [ 10, 50 ] ] ]),
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = geometryCollection([
                polygon([ [ [ 10, 10 ], [ 40, 10 ], [ 40, 20 ], [ 10, 20 ], [ 10, 10 ] ] ]),
                polygon([ [ [ 40, 10 ], [ 50, 10 ], [ 50, 40 ], [ 40, 40 ], [ 40, 10 ] ] ]),
                polygon([ [ [ 20, 40 ], [ 50, 40 ], [ 50, 50 ], [ 20, 50 ], [ 20, 40 ] ] ]),
                polygon([ [ [ 10, 20 ], [ 20, 20 ], [ 20, 50 ], [ 10, 50 ], [ 10, 20 ] ] ]),
                polygon([ [ [ 20, 20 ], [ 40, 20 ], [ 40, 40 ], [ 20, 40 ], [ 20, 20 ] ] ]),
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('disjoint', () => {
            expectedRelations = {
                equals: false,
                intersects: false,
                disjoint: true,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: 'FF2FF1212',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            // inside polygon hole
            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = polygon([ [ [ 31, 31 ], [ 39, 31 ], [ 39, 39 ], [ 31, 39 ], [ 31, 31 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);
        });

        it('contains/covers', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: true,
                containsProperly: true,
                within: false,
                covers: true,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: false,
                relate: '212FF1FF2',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = multiPolygon([
                [ [ [ 20, 20 ], [ 30, 20 ], [ 30, 30 ], [ 20, 30 ], [ 20, 20 ] ] ],
                [ [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ] ],
            ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 40, 10 ], [ 50, 20 ], [ 20, 50 ], [ 10, 40 ], [ 40, 10 ] ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '212F01FF2', containsProperly: false });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '212F01FF2', containsProperly: false });

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 20, 10 ], [ 20, 50 ], [ 30, 50 ], [ 30, 10 ], [ 20, 10 ] ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '212F11FF2', containsProperly: false });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '212F11FF2', containsProperly: false });
        });

        it('overlaps', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: true,
                touches: false,
                relate: '212101212',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 30, 30 ], [ 30, 70 ], [ 70, 70 ], [ 70, 30 ], [ 30, 30 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 0, 60 ], [ 30, 30 ], [ 60, 60 ], [ 0, 60 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 0, 60 ], [ 60, 0 ], [ 60, 60 ], [ 0, 60 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = polygon([ [ [ 25, 25 ], [ 45, 25 ], [ 45, 45 ], [ 25, 45 ], [ 25, 25 ] ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '2121F12F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '2121F12F2' });

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = polygon([ [ [ 25, 25 ], [ 45, 25 ], [ 50, 50 ], [ 25, 45 ], [ 25, 25 ] ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '2121012F2' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '2121012F2' });

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 12, 12 ], [ 12, 48 ], [ 48, 48 ], [ 48, 12 ], [ 12, 12 ] ],
            ]);
            b = polygon([
                [ [ 11, 11 ], [ 11, 49 ], [ 49, 49 ], [ 49, 11 ], [ 11, 11 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: '2121F1212' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: '2121F1212' });
        });

        it('touches', () => {
            expectedRelations = {
                equals: false,
                intersects: true,
                disjoint: false,
                contains: false,
                containsProperly: false,
                within: false,
                covers: false,
                coveredBy: false,
                crosses: false,
                overlaps: false,
                touches: true,
                relate: 'FF2F11212',
            };

            a = polygon([ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ]);
            b = polygon([ [ [ 50, 30 ], [ 50, 70 ], [ 90, 70 ], [ 90, 30 ], [ 50, 30 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = multiPolygon([
                [ [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ] ],
                [ [ [ 60, 30 ], [ 60, 70 ], [ 100, 70 ], [ 100, 30 ], [ 60, 30 ] ] ],
            ]);
            b = polygon([ [ [ 50, 40 ], [ 50, 60 ], [ 60, 60 ], [ 60, 40 ], [ 50, 40 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = polygon([ [ [ 30, 30 ], [ 35, 30 ], [ 35, 35 ], [ 30, 35 ], [ 30, 30 ] ] ]);
            assert.deepEqual(getRelations(a, b), expectedRelations);
            assert.deepEqual(getRelations(prepare(a), b), expectedRelations);

            a = polygon([
                [ [ 10, 10 ], [ 10, 50 ], [ 50, 50 ], [ 50, 10 ], [ 10, 10 ] ],
                [ [ 30, 30 ], [ 40, 30 ], [ 40, 40 ], [ 30, 40 ], [ 30, 30 ] ],
            ]);
            b = polygon([ [ [ 35, 30 ], [ 40, 35 ], [ 35, 40 ], [ 30, 35 ], [ 35, 30 ] ] ]);
            assert.deepEqual(getRelations(a, b), { ...expectedRelations, relate: 'FF2F01212' });
            assert.deepEqual(getRelations(prepare(a), b), { ...expectedRelations, relate: 'FF2F01212' });
        });

    });

    describe('equals', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => equals(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('intersects', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => intersects(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('disjoint', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => disjoint(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('contains', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => contains(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('containsProperly', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => containsProperly(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('within', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => within(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('covers', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => covers(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('coveredBy', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => coveredBy(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('crosses', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => crosses(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('overlaps', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => overlaps(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('touches', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => touches(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('relate', () => {

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => relate(a, b), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

    describe('relatePattern', () => {

        it('should return whether geometries relationship matches specified pattern', () => {
            a = polygon([ [ [ 0, 0 ], [ 0, 7 ], [ 4, 7 ], [ 4, 0 ], [ 0, 0 ] ] ]);
            b = polygon([ [ [ 2, 1 ], [ 2, 4 ], [ 8, 4 ], [ 8, 1 ], [ 2, 1 ] ] ]);

            assert.equal(relate(a, b), '212101212');

            assert.equal(relatePattern(a, b, '212101212'), true);
            assert.equal(relatePattern(a, b, 'TTTTTTTTT'), true);
            assert.equal(relatePattern(a, b, '*********'), true);
            assert.equal(relatePattern(a, b, 'T*T***T**'), true);
            assert.equal(relatePattern(a, b, 'T*****FF*'), false);

            assert.equal(relatePattern(prepare(a), b, '212101212'), true);
            assert.equal(relatePattern(prepare(a), b, 'TTTTTTTTT'), true);
            assert.equal(relatePattern(prepare(a), b, '*********'), true);
            assert.equal(relatePattern(prepare(a), b, 'T*T***T**'), true);
            assert.equal(relatePattern(prepare(a), b, 'T*****FF*'), false);
        });

        it('should throw on unsupported geometry type', () => {
            a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.throws(() => relatePattern(a, b, '********'), {
                name: 'GEOSError::UnsupportedOperationException',
                message: 'Curved geometry types are not supported.',
            });
        });

    });

});
