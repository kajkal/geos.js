import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/geometry.mjs';
import { lineString, point } from '../../src/misc/helpers.mjs';
import { fromWKT, toWKT } from '../../src/io/wkt.mjs';
import { buffer } from '../../src/operation/buffer.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('buffer', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should reuse existing BufferParams instance', () => {
        const create = mock.method(geos, 'GEOSBufferParams_create');

        const a = point([ 0, 0 ]);
        const b = lineString([ [ 0, 0 ], [ 10, 10 ] ]);

        buffer(a, 10);
        buffer(b, 10);
        assert.equal(create.mock.callCount(), 1);

        buffer(a, 10, { endCapStyle: 'flat', quadrantSegments: 12 });
        buffer(b, 10, { endCapStyle: 'flat', quadrantSegments: 12 });
        assert.equal(create.mock.callCount(), 2);

        buffer(a, 10, { quadrantSegments: 12 });
        buffer(b, 10, { quadrantSegments: 12 });
        assert.equal(create.mock.callCount(), 3);

        assert.deepEqual(geos.b_p, {
            null: create.mock.calls[ 0 ].result,
            '12,flat,,,': create.mock.calls[ 1 ].result,
            '12,,,,': create.mock.calls[ 2 ].result,
        });
    });

    it('should set `quadrantSegments` option', () => {
        const set = mock.method(geos, 'GEOSBufferParams_setQuadrantSegments');
        const input = point([ 0, 0 ]);
        buffer(input, 10);
        assert.equal(set.mock.callCount(), 0);
        buffer(input, 10, { quadrantSegments: 10 });
        assert.equal(set.mock.callCount(), 1);
        assert.equal(set.mock.calls[ 0 ].arguments[ 1 ], 10);
    });

    it('should set `endCapStyle` option', () => {
        const set = mock.method(geos, 'GEOSBufferParams_setEndCapStyle');
        const input = point([ 0, 0 ]);
        buffer(input, 10);
        assert.equal(set.mock.callCount(), 0);
        buffer(input, 10, { endCapStyle: 'flat' });
        assert.equal(set.mock.callCount(), 1);
        assert.equal(set.mock.calls[ 0 ].arguments[ 1 ], 2);
    });

    it('should set `joinStyle` option', () => {
        const set = mock.method(geos, 'GEOSBufferParams_setJoinStyle');
        const input = point([ 0, 0 ]);
        buffer(input, 10);
        assert.equal(set.mock.callCount(), 0);
        buffer(input, 10, { joinStyle: 'mitre' });
        assert.equal(set.mock.callCount(), 1);
        assert.equal(set.mock.calls[ 0 ].arguments[ 1 ], 2);
    });

    it('should set `mitreLimit` option', () => {
        const set = mock.method(geos, 'GEOSBufferParams_setMitreLimit');
        const input = point([ 0, 0 ]);
        buffer(input, 10);
        assert.equal(set.mock.callCount(), 0);
        buffer(input, 10, { mitreLimit: 10 });
        assert.equal(set.mock.callCount(), 1);
        assert.equal(set.mock.calls[ 0 ].arguments[ 1 ], 10);
    });

    it('should set `singleSided` option', () => {
        const set = mock.method(geos, 'GEOSBufferParams_setSingleSided');
        const input = point([ 0, 0 ]);
        buffer(input, 10);
        assert.equal(set.mock.callCount(), 0);
        buffer(input, 10, { singleSided: true });
        assert.equal(set.mock.callCount(), 1);
        assert.equal(set.mock.calls[ 0 ].arguments[ 1 ], 1);
    });

    it('should return empty polygon', () => {
        let o: Geometry;

        o = buffer(fromWKT('POINT EMPTY'), 10);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = buffer(fromWKT('POINT (1 1)'), 0);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = buffer(fromWKT('POINT (1 1)'), -1);
        assert.equal(toWKT(o), 'POLYGON EMPTY');

        o = buffer(fromWKT('LINESTRING EMPTY'), 10);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = buffer(fromWKT('LINESTRING(5 10, 10 20)'), 0);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = buffer(fromWKT('LINESTRING(5 10, 10 20)'), -1);
        assert.equal(toWKT(o), 'POLYGON EMPTY');

        o = buffer(fromWKT('POLYGON EMPTY'), 10);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = buffer(fromWKT('POLYGON ((0 0, 1 0, 1 1, 0 0))'), -1);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
    });

    it('should return buffered linestring', () => {
        let i: Geometry, o: Geometry;

        i = fromWKT('LINESTRING(5 10, 10 20)');
        o = buffer(i, 5, { quadrantSegments: 1 });
        assert.equal(o.area(), 161.80339887498948);

        i = fromWKT('LINESTRING(5 10, 10 20)');
        o = buffer(i, 5, { quadrantSegments: 2 });
        assert.equal(o.area(), 182.51407699364424);

        i = fromWKT('LINESTRING(5 10, 10 20)');
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'square' });
        assert.equal(o.area(), 211.8033988749895);

        i = fromWKT('LINESTRING(5 10, 10 20)');
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'flat' });
        assert.equal(o.area(), 111.80339887498948);

        i = fromWKT('LINESTRING(5 10, 10 10)');
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'flat' });
        assert.equal(o.area(), 50);
        assert.equal(toWKT(o), 'POLYGON ((10 15, 10 5, 5 5, 5 15, 10 15))');

        i = fromWKT('LINESTRING(5 10, 10 10)');
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'square' });
        assert.equal(o.area(), 150);
        assert.equal(toWKT(o), 'POLYGON ((10 15, 15 15, 15 5, 5 5, 0 5, 0 15, 10 15))');

        i = fromWKT('LINESTRING(5 10, 10 10, 10 20)'); // L shape line
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'square' });
        assert.equal(o.area(), 244.61477393196125);

        i = fromWKT('LINESTRING(5 10, 10 10, 10 20)'); // L shape line
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'square', joinStyle: 'mitre' });
        assert.equal(o.area(), 250);
        assert.equal(toWKT(o), 'POLYGON ((5 15, 5 20, 5 25, 15 25, 15 5, 5 5, 0 5, 0 15, 5 15))');

        i = fromWKT('LINESTRING(5 10, 10 10, 10 20)'); // L shape line
        o = buffer(i, 5, { quadrantSegments: 20, endCapStyle: 'square', joinStyle: 'bevel' });
        assert.equal(o.area(), 237.5);
        assert.equal(toWKT(o), 'POLYGON ((5 15, 5 20, 5 25, 15 25, 15 10, 10 5, 5 5, 0 5, 0 15, 5 15))');

        i = fromWKT('LINESTRING(5 10, 10 10, 10 20)'); // L shape line
        o = buffer(i, 5, { quadrantSegments: 200, endCapStyle: 'square', joinStyle: 'bevel', mitreLimit: 10 });
        assert.equal(o.area(), 237.5);
        assert.equal(toWKT(o), 'POLYGON ((5 15, 5 20, 5 25, 15 25, 15 10, 10 5, 5 5, 0 5, 0 15, 5 15))');

        i = fromWKT('LINESTRING(5 10, 10 10, 10 20)'); // L shape line
        o = buffer(i, 5, { quadrantSegments: 200, endCapStyle: 'square', joinStyle: 'bevel', mitreLimit: 10 });
        assert.equal(o.area(), 237.5);
        assert.equal(toWKT(o), 'POLYGON ((5 15, 5 20, 5 25, 15 25, 15 10, 10 5, 5 5, 0 5, 0 15, 5 15))');

        i = fromWKT('LINESTRING(5 10, 10 10)');
        o = buffer(i, 2, { endCapStyle: 'square' });
        assert.equal(toWKT(o), 'POLYGON ((10 12, 12 12, 12 8, 5 8, 3 8, 3 12, 10 12))');

        i = fromWKT('LINESTRING(5 10, 10 10)');
        o = buffer(i, 2, { endCapStyle: 'square', singleSided: true }); // single sided (left)
        assert.equal(toWKT(o), 'POLYGON ((10 10, 5 10, 5 12, 10 12, 10 10))');

        i = fromWKT('LINESTRING(5 10, 10 10)');
        o = buffer(i, -2, { endCapStyle: 'square', singleSided: true }); // single sided (right)
        assert.equal(toWKT(o), 'POLYGON ((5 10, 10 10, 10 8, 5 8, 5 10))');
    });

    it('should return buffered polygon', () => {
        let i: Geometry, o: Geometry;

        i = fromWKT('POLYGON((0 0, 10 0, 10 10, 0 0))');
        o = buffer(i, 2, { quadrantSegments: 200, endCapStyle: 'flat', joinStyle: 'mitre', mitreLimit: 1 });
        assert.equal(o.area(), 132.2888379531555);

        i = fromWKT('POLYGON((0 0, 10 0, 10 10, 0 0))');
        o = buffer(i, 2, { quadrantSegments: 200, endCapStyle: 'flat', joinStyle: 'mitre', mitreLimit: 2 });
        assert.equal(o.area(), 140.3522791618947);

        i = fromWKT('POLYGON((0 0, 10 0, 10 10, 0 0))');
        o = buffer(i, 2, { quadrantSegments: 200, endCapStyle: 'flat', joinStyle: 'mitre', mitreLimit: 3 });
        assert.equal(o.area(), 141.59797974644667);

        i = fromWKT('POLYGON ((4.6664239253667485 4.9470840685113275, 4.666423925366749 4.947084068511328, 3.569508914897422 -10.739531408188364, -9.082056557097435 19.893317266250286, 5.639581102785941 18.86388007810711, 4.6664239253667485 4.9470840685113275))');
        o = buffer(i, -1, { joinStyle: 'mitre' });
        assert.equal(toWKT(o), 'POLYGON ((3.3225774291798533 0.0647708524944821, 3.3225774291798555 0.0647708524944812, 2.8688758567150883 -6.423463915469626, -7.5416226086581215 18.783157733145195, 4.572260578781992 17.936072501591408, 3.3225774291798533 0.0647708524944821))');
    });

    it('should throw on unsupported geometry type', () => {
        const a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        assert.throws(() => buffer(a, 10), {
            name: 'GeosError::UnsupportedOperationException',
            message: 'GeometryGraph::add(Geometry &): unknown geometry type: N4geos4geom14CircularStringE',
        });
    });

});
