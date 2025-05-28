import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { lineString } from '../../src/helpers/helpers.mjs';
import { fromWKB, toWKB } from '../../src/io/wkb.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('WKB', () => {

    const fromHEX = (hex: string) => new Uint8Array(Buffer.from(hex, 'hex'));
    const toHEX = (data: Uint8Array) => Buffer.from(data).toString('hex');

    before(async () => {
        await initializeForTest();
    });

    describe('from', () => {

        it('should reuse existing WKBReader instance', () => {
            const create = mock.method(geos, 'GEOSWKBReader_create');

            const wkb1 = fromHEX('0101000000000000000000f03f000000000000f03f');
            const wkb2 = fromHEX('010100000000000000000000400000000000000040');

            fromWKB(wkb1);
            fromWKB(wkb2);
            assert.equal(create.mock.callCount(), 1);

            fromWKB(wkb1, { fix: false });
            fromWKB(wkb2, { fix: false });
            assert.equal(create.mock.callCount(), 2);

            fromWKB(wkb1, { fix: true });
            fromWKB(wkb2, { fix: true });
            assert.equal(create.mock.callCount(), 3);

            assert.deepEqual(geos.b_r, {
                null: create.mock.calls[ 0 ].result,
                'false': create.mock.calls[ 1 ].result,
                'true': create.mock.calls[ 2 ].result,
            });
        });

        it('should handle `fix` option', () => {
            const input = fromHEX('0103000000010000000300000000000000000000000000000000000000000000000000f03f0000000000000000000000000000f03f000000000000f03f'); // POLYGON ((0 0, 1 0, 1 1))
            assert.throws(() => fromWKB(input, { fix: false }), {
                name: 'GEOSError::IllegalArgumentException',
                message: 'Points of LinearRing do not form a closed linestring',
            });
            assert.throws(() => fromWKB(input), { // default
                name: 'GEOSError::IllegalArgumentException',
                message: 'Points of LinearRing do not form a closed linestring',
            });
            assert.deepEqual(fromWKB(input, { fix: true }).toJSON(), {
                type: 'Polygon',
                coordinates: [ [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 0 ] ] ],
            });
        });

        it('should read WKB geometries', () => {
            const wkbToJSONStr = (hex: string) => JSON.stringify(fromWKB(fromHEX(hex)));
            let g: string;

            g = wkbToJSONStr('010100000000000000000000000000000000000000');
            assert.equal(g, '{"type":"Point","coordinates":[0,0]}');
            g = wkbToJSONStr('000000000100000000000000000000000000000000');
            assert.equal(g, '{"type":"Point","coordinates":[0,0]}');

            g = wkbToJSONStr('010200000002000000000000000000F03F000000000000004000000000000008400000000000001040');
            assert.equal(g, '{"type":"LineString","coordinates":[[1,2],[3,4]]}');
            g = wkbToJSONStr('0000000002000000023FF0000000000000400000000000000040080000000000004010000000000000');
            assert.equal(g, '{"type":"LineString","coordinates":[[1,2],[3,4]]}');

            g = wkbToJSONStr('0103000000020000000500000000000000000000000000000000000000000000000000244000000000000000000000000000002440000000000000244000000000000000000000000000002440000000000000000000000000000000000400000000000000000000400000000000000040000000000000004000000000000018400000000000001840000000000000104000000000000000400000000000000040');
            assert.equal(g, '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]]}');
            g = wkbToJSONStr('0000000003000000020000000500000000000000000000000000000000402400000000000000000000000000004024000000000000402400000000000000000000000000004024000000000000000000000000000000000000000000000000000440000000000000004000000000000000400000000000000040180000000000004018000000000000401000000000000040000000000000004000000000000000');
            assert.equal(g, '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]]}');

            g = wkbToJSONStr('010400000005000000010100000000000000000000000000000000000000010100000000000000000024400000000000000000010100000000000000000024400000000000002440010100000000000000000000000000000000002440010100000000000000000000000000000000000000');
            assert.equal(g, '{"type":"MultiPoint","coordinates":[[0,0],[10,0],[10,10],[0,10],[0,0]]}');
            g = wkbToJSONStr('000000000400000005000000000100000000000000000000000000000000000000000140240000000000000000000000000000000000000140240000000000004024000000000000000000000100000000000000004024000000000000000000000100000000000000000000000000000000');
            assert.equal(g, '{"type":"MultiPoint","coordinates":[[0,0],[10,0],[10,10],[0,10],[0,0]]}');

            g = wkbToJSONStr('010500000002000000010200000005000000000000000000000000000000000000000000000000002440000000000000000000000000000024400000000000002440000000000000000000000000000024400000000000002440000000000000344001020000000400000000000000000000400000000000000040000000000000004000000000000018400000000000001840000000000000104000000000000034400000000000000040');
            assert.equal(g, '{"type":"MultiLineString","coordinates":[[[0,0],[10,0],[10,10],[0,10],[10,20]],[[2,2],[2,6],[6,4],[20,2]]]}');
            g = wkbToJSONStr('000000000500000002000000000200000005000000000000000000000000000000004024000000000000000000000000000040240000000000004024000000000000000000000000000040240000000000004024000000000000403400000000000000000000020000000440000000000000004000000000000000400000000000000040180000000000004018000000000000401000000000000040340000000000004000000000000000');
            assert.equal(g, '{"type":"MultiLineString","coordinates":[[[0,0],[10,0],[10,10],[0,10],[10,20]],[[2,2],[2,6],[6,4],[20,2]]]}');

            g = wkbToJSONStr('0106000000020000000103000000020000000500000000000000000000000000000000000000000000000000244000000000000000000000000000002440000000000000244000000000000000000000000000002440000000000000000000000000000000000400000000000000000000400000000000000040000000000000004000000000000018400000000000001840000000000000104000000000000000400000000000000040010300000001000000040000000000000000004E400000000000004E400000000000004E400000000000004940000000000080514000000000000044400000000000004E400000000000004E40');
            assert.equal(g, '{"type":"MultiPolygon","coordinates":[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]],[[[60,60],[60,50],[70,40],[60,60]]]]}');
            g = wkbToJSONStr('000000000600000002000000000300000002000000050000000000000000000000000000000040240000000000000000000000000000402400000000000040240000000000000000000000000000402400000000000000000000000000000000000000000000000000044000000000000000400000000000000040000000000000004018000000000000401800000000000040100000000000004000000000000000400000000000000000000000030000000100000004404E000000000000404E000000000000404E000000000000404900000000000040518000000000004044000000000000404E000000000000404E000000000000');
            assert.equal(g, '{"type":"MultiPolygon","coordinates":[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]],[[[60,60],[60,50],[70,40],[60,60]]]]}');

            g = wkbToJSONStr('010700000006000000010100000000000000000000000000000000000000010200000002000000000000000000F03F00000000000000400000000000000840000000000000104001030000000200000005000000000000000000000000000000000000000000000000002440000000000000000000000000000024400000000000002440000000000000000000000000000024400000000000000000000000000000000004000000000000000000004000000000000000400000000000000040000000000000184000000000000018400000000000001040000000000000004000000000000000400104000000050000000101000000000000000000000000000000000000000101000000000000000000244000000000000000000101000000000000000000244000000000000024400101000000000000000000000000000000000024400101000000000000000000000000000000000000000105000000020000000102000000050000000000000000000000000000000000000000000000000024400000000000000000000000000000244000000000000024400000000000000000000000000000244000000000000024400000000000003440010200000004000000000000000000004000000000000000400000000000000040000000000000184000000000000018400000000000001040000000000000344000000000000000400106000000020000000103000000020000000500000000000000000000000000000000000000000000000000244000000000000000000000000000002440000000000000244000000000000000000000000000002440000000000000000000000000000000000400000000000000000000400000000000000040000000000000004000000000000018400000000000001840000000000000104000000000000000400000000000000040010300000001000000040000000000000000004E400000000000004E400000000000004E400000000000004940000000000080514000000000000044400000000000004E400000000000004E40');
            assert.equal(g, '{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[0,0]},{"type":"LineString","coordinates":[[1,2],[3,4]]},{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]]},{"type":"MultiPoint","coordinates":[[0,0],[10,0],[10,10],[0,10],[0,0]]},{"type":"MultiLineString","coordinates":[[[0,0],[10,0],[10,10],[0,10],[10,20]],[[2,2],[2,6],[6,4],[20,2]]]},{"type":"MultiPolygon","coordinates":[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]],[[[60,60],[60,50],[70,40],[60,60]]]]}]}');
            g = wkbToJSONStr('0000000007000000060000000001000000000000000000000000000000000000000002000000023FF00000000000004000000000000000400800000000000040100000000000000000000003000000020000000500000000000000000000000000000000402400000000000000000000000000004024000000000000402400000000000000000000000000004024000000000000000000000000000000000000000000000000000440000000000000004000000000000000400000000000000040180000000000004018000000000000401000000000000040000000000000004000000000000000000000000400000005000000000100000000000000000000000000000000000000000140240000000000000000000000000000000000000140240000000000004024000000000000000000000100000000000000004024000000000000000000000100000000000000000000000000000000000000000500000002000000000200000005000000000000000000000000000000004024000000000000000000000000000040240000000000004024000000000000000000000000000040240000000000004024000000000000403400000000000000000000020000000440000000000000004000000000000000400000000000000040180000000000004018000000000000401000000000000040340000000000004000000000000000000000000600000002000000000300000002000000050000000000000000000000000000000040240000000000000000000000000000402400000000000040240000000000000000000000000000402400000000000000000000000000000000000000000000000000044000000000000000400000000000000040000000000000004018000000000000401800000000000040100000000000004000000000000000400000000000000000000000030000000100000004404E000000000000404E000000000000404E000000000000404900000000000040518000000000004044000000000000404E000000000000404E000000000000');
            assert.equal(g, '{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[0,0]},{"type":"LineString","coordinates":[[1,2],[3,4]]},{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]]},{"type":"MultiPoint","coordinates":[[0,0],[10,0],[10,10],[0,10],[0,0]]},{"type":"MultiLineString","coordinates":[[[0,0],[10,0],[10,10],[0,10],[10,20]],[[2,2],[2,6],[6,4],[20,2]]]},{"type":"MultiPolygon","coordinates":[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,6],[6,4],[2,2]]],[[[60,60],[60,50],[70,40],[60,60]]]]}]}');


            g = wkbToJSONStr('01010000a0917d0000000000000000084000000000000020400000000000000000');
            assert.equal(g, '{"type":"Point","coordinates":[3,8,0]}');


            g = wkbToJSONStr('0101000000000000000000F87F000000000000F87F');
            assert.equal(g, '{"type":"Point","coordinates":[]}');
            g = wkbToJSONStr('010200000000000000');
            assert.equal(g, '{"type":"LineString","coordinates":[]}');
            g = wkbToJSONStr('010300000000000000');
            assert.equal(g, '{"type":"Polygon","coordinates":[]}');
            g = wkbToJSONStr('010400000000000000');
            assert.equal(g, '{"type":"MultiPoint","coordinates":[]}');
            g = wkbToJSONStr('010500000000000000');
            assert.equal(g, '{"type":"MultiLineString","coordinates":[]}');
            g = wkbToJSONStr('010600000000000000');
            assert.equal(g, '{"type":"MultiPolygon","coordinates":[]}');
            g = wkbToJSONStr('010700000000000000');
            assert.equal(g, '{"type":"GeometryCollection","geometries":[]}');

            assert.throws(() => fromWKB(fromHEX('01010000000000000000000000000000000000000')), {
                name: 'GEOSError::ParseException',
                message: 'Input buffer is smaller than requested object size',
            });
        });

        it('should handle big inputs', () => {
            const coordinatesCount = 100_000;
            const meta = new Uint32Array([ 2, coordinatesCount ]);
            const coordinates = new Float64Array(coordinatesCount * 2);
            for (let i = 0, c = 0; i < coordinatesCount; i++) {
                coordinates[ c++ ] = Math.random();
                coordinates[ c++ ] = Math.random();
            }
            const wkb = Buffer.concat([
                new Uint8Array([ 1 ]), // byte order
                new Uint8Array(meta.buffer), // type + coordinates count
                new Uint8Array(coordinates.buffer), // coordinates
            ]);

            const g = fromWKB(wkb).toJSON();
            assert.equal(g.type, 'LineString');
            assert.equal(g.coordinates.length, coordinatesCount);
            for (let i = 0, c = 0; i < coordinatesCount; i++) {
                assert.deepEqual(g.coordinates[ i ], [ coordinates[ c++ ], coordinates[ c++ ] ]);
            }
        });

    });

    describe('to', () => {

        it('should reuse existing WKBWriter instance', () => {
            const create = mock.method(geos, 'GEOSWKBWriter_create');

            const pt1 = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            const pt2 = fromWKT('POINT Z (1.987654321 1.123456789 30)');

            toWKB(pt1);
            toWKB(pt2);
            assert.equal(create.mock.callCount(), 1);

            toWKB(pt1, { dim: 2 });
            toWKB(pt2, { dim: 2 });
            assert.equal(create.mock.callCount(), 2);

            toWKB(pt1, { dim: 2, flavor: 'iso' });
            toWKB(pt2, { dim: 2, flavor: 'iso' });
            assert.equal(create.mock.callCount(), 3);

            toWKB(pt1, { dim: 3, byteOrder: 'be' });
            toWKB(pt2, { dim: 3, byteOrder: 'be' });
            assert.equal(create.mock.callCount(), 4);

            assert.deepEqual(geos.b_w, {
                null: create.mock.calls[ 0 ].result,
                '2,,,': create.mock.calls[ 1 ].result,
                '2,iso,,': create.mock.calls[ 2 ].result,
                '3,,be,': create.mock.calls[ 3 ].result,
            });
        });

        it('should handle `dim` option', () => {
            const pt = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            assert.deepEqual(toWKB(pt, { dim: 2 }), fromHEX('01010000005f633937dd9abfbfae95034fb7e60f40'));
            assert.deepEqual(toWKB(pt, { dim: 3 }), fromHEX('01010000805f633937dd9abfbfae95034fb7e60f400000000000002440'));
            assert.deepEqual(toWKB(pt, { dim: 4 }), fromHEX('01010000c05f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { dim: 4 }), toWKB(pt)); // default
        });

        it('should handle `flavor` option', () => {
            const pt = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            assert.deepEqual(toWKB(pt, { flavor: 'iso' }), fromHEX('01b90b00005f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { flavor: 'extended' }), fromHEX('01010000c05f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { flavor: 'extended' }), toWKB(pt)); // default
        });

        it('should handle `byteOrder` option', () => {
            const pt = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            assert.deepEqual(toWKB(pt, { byteOrder: 'be' }), fromHEX('00c0000001bfbf9add3739635f400fe6b74f0395ae40240000000000004010000000000000'));
            assert.deepEqual(toWKB(pt, { byteOrder: 'le' }), fromHEX('01010000c05f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { byteOrder: 'le' }), toWKB(pt)); // default
        });

        it.todo('should handle `srid` option', () => {
            const pt = fromWKT('POINT ZM (-0.123456789 3.987654321 10 4)');
            // todo set some srid
            assert.deepEqual(toWKB(pt, { srid: true }), fromHEX('01010000c05f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { srid: false }), fromHEX('01010000c05f633937dd9abfbfae95034fb7e60f4000000000000024400000000000001040'));
            assert.deepEqual(toWKB(pt, { srid: false }), toWKB(pt)); // default
        });

        it('should write WKB geometries', () => {
            const wktToWkbHex = (wkt: string) => toHEX(toWKB(fromWKT(wkt)));
            let g: string;

            g = wktToWkbHex('POINT EMPTY');
            assert.equal(g, '0101000000000000000000f87f000000000000f87f');
            g = wktToWkbHex('POINT(1 1)');
            assert.equal(g, '0101000000000000000000f03f000000000000f03f');

            g = wktToWkbHex('LINESTRING EMPTY');
            assert.equal(g, '010200000000000000');
            g = wktToWkbHex('LINESTRING(0 0, 1 1)');
            assert.equal(g, '01020000000200000000000000000000000000000000000000000000000000f03f000000000000f03f');

            g = wktToWkbHex('POLYGON EMPTY');
            assert.equal(g, '010300000000000000');
            g = wktToWkbHex('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
            assert.equal(g, '01030000000100000005000000000000000000000000000000000000000000000000000000000000000000f03f000000000000f03f000000000000f03f000000000000f03f000000000000000000000000000000000000000000000000');

            g = wktToWkbHex('MULTIPOINT EMPTY');
            assert.equal(g, '010400000000000000');
            g = wktToWkbHex('MULTIPOINT((1 1),(2 2))');
            assert.equal(g, '0104000000020000000101000000000000000000f03f000000000000f03f010100000000000000000000400000000000000040');

            g = wktToWkbHex('MULTILINESTRING EMPTY');
            assert.equal(g, '010500000000000000');
            g = wktToWkbHex('MULTILINESTRING((0 0, 1 1),(2 2, 3 3))');
            assert.equal(g, '01050000000200000001020000000200000000000000000000000000000000000000000000000000f03f000000000000f03f0102000000020000000000000000000040000000000000004000000000000008400000000000000840');

            g = wktToWkbHex('MULTIPOLYGON EMPTY');
            assert.equal(g, '010600000000000000');
            g = wktToWkbHex('MULTIPOLYGON(((0 0, 0 1, 1 1, 1 0, 0 0)),((2 2, 2 3, 3 3, 2 2)))');
            assert.equal(g, '01060000000200000001030000000100000005000000000000000000000000000000000000000000000000000000000000000000f03f000000000000f03f000000000000f03f000000000000f03f0000000000000000000000000000000000000000000000000103000000010000000400000000000000000000400000000000000040000000000000004000000000000008400000000000000840000000000000084000000000000000400000000000000040');

            g = wktToWkbHex('GEOMETRYCOLLECTION EMPTY');
            assert.equal(g, '010700000000000000');
            g = wktToWkbHex('GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (0 0, 1 1), POLYGON((2 2, 2 3, 3 3, 2 2)))');
            assert.equal(g, '0107000000030000000101000000000000000000f03f000000000000f03f01020000000200000000000000000000000000000000000000000000000000f03f000000000000f03f0103000000010000000400000000000000000000400000000000000040000000000000004000000000000008400000000000000840000000000000084000000000000000400000000000000040');

            g = wktToWkbHex('CIRCULARSTRING EMPTY');
            assert.equal(g, '010800000000000000');
            g = wktToWkbHex('CIRCULARSTRING (0 0, 1 1, 2 0)');
            assert.equal(g, '01080000000300000000000000000000000000000000000000000000000000f03f000000000000f03f00000000000000400000000000000000');

            g = wktToWkbHex('COMPOUNDCURVE EMPTY');
            assert.equal(g, '010900000000000000');
            g = wktToWkbHex('COMPOUNDCURVE (CIRCULARSTRING (0 0, 1 1, 2 0), (2 0, 3 0))');
            assert.equal(g, '01090000000200000001080000000300000000000000000000000000000000000000000000000000f03f000000000000f03f000000000000004000000000000000000102000000020000000000000000000040000000000000000000000000000008400000000000000000');

            g = wktToWkbHex('CURVEPOLYGON EMPTY');
            assert.equal(g, '010a00000000000000');
            g = wktToWkbHex('CURVEPOLYGON (CIRCULARSTRING (0 0, 1 1, 2 0, 1 -1, 0 0))');
            assert.equal(g, '010a0000000100000001080000000500000000000000000000000000000000000000000000000000f03f000000000000f03f00000000000000400000000000000000000000000000f03f000000000000f0bf00000000000000000000000000000000');

            g = wktToWkbHex('MULTICURVE EMPTY');
            assert.equal(g, '010b00000000000000');
            g = wktToWkbHex('MULTICURVE ((0 0, 1 1), CIRCULARSTRING (0 0, 1 1, 2 0))');
            assert.equal(g, '010b0000000200000001020000000200000000000000000000000000000000000000000000000000f03f000000000000f03f01080000000300000000000000000000000000000000000000000000000000f03f000000000000f03f00000000000000400000000000000000');

            g = wktToWkbHex('MULTISURFACE EMPTY');
            assert.equal(g, '010c00000000000000');
            g = wktToWkbHex('MULTISURFACE (((0 0, 1 0, 1 1, 0 1, 0 0)), CURVEPOLYGON (CIRCULARSTRING (10 10, 11 11, 12 10, 11 9, 10 10)))');
            assert.equal(g, '010c000000020000000103000000010000000500000000000000000000000000000000000000000000000000f03f0000000000000000000000000000f03f000000000000f03f0000000000000000000000000000f03f00000000000000000000000000000000010a000000010000000108000000050000000000000000002440000000000000244000000000000026400000000000002640000000000000284000000000000024400000000000002640000000000000224000000000000024400000000000002440');
        });

        it('should handle big inputs', () => {
            const coordinatesCount = 100_000;
            const coordinates = new Float64Array(coordinatesCount * 2);
            const pts = Array.from<number[]>({ length: coordinatesCount });
            for (let i = 0, c = 0; i < coordinatesCount; i++) {
                pts[ i ] = [ coordinates[ c++ ] = Math.random(), coordinates[ c++ ] = Math.random() ];
            }

            const g = lineString(pts);
            const wkbData = new DataView(toWKB(g).buffer);

            assert.equal(wkbData.getUint8(0), 1); // le
            assert.equal(wkbData.getUint32(1, true), 2); // line string type
            assert.equal(wkbData.getUint32(5, true), coordinatesCount);
            for (let i = 0, c = 0, o = 9; i < coordinatesCount; i++) {
                assert.equal(wkbData.getFloat64(o, true), coordinates[ c++ ]), o += 8;
                assert.equal(wkbData.getFloat64(o, true), coordinates[ c++ ]), o += 8;
            }
        });

    });

});
