import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { POINTER } from '../../src/core/symbols.mjs';
import { lineString } from '../../src/helpers/helpers.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('geos', () => {

    before(async () => {
        await initializeForTest();
    });

    describe('string encoding/decoding', () => {

        it('should encode string', () => {
            const ptr = geos.buff[ POINTER ];
            const view = geos.U8.subarray(ptr, ptr + 8).fill(255);
            assert.deepEqual(view, new Uint8Array([ 255, 255, 255, 255, 255, 255, 255, 255 ]));
            geos.encodeString('POINT');
            assert.deepEqual(view, new Uint8Array([ 80, 79, 73, 78, 84, 0, 255, 255 ]));
        });

        it('should throw on complex string', () => {
            assert.throws(() => geos.encodeString('żuk'), {
                name: 'GEOSError',
                message: 'Unexpected string encoding result',
            });
        });

        it('should decode string', () => {
            const ptr = geos.malloc<string>(8);
            geos.U8.set(new Uint8Array([ 80, 79, 73, 78, 84, 0 ]), ptr);
            assert.equal(geos.decodeString(ptr), 'POINT');
            geos.free(ptr);
        });

        it('should decode empty string', () => {
            const ptr = geos.malloc<string>(8);
            geos.U8.set(new Uint8Array(8).fill(0), ptr);
            assert.equal(geos.decodeString(ptr), '');
            geos.free(ptr);
        });

    });

    describe('memory management', () => {

        it('should export reusable u32 pointer', () => {
            const u = geos.u1;
            const view = geos.U8.subarray(u[ POINTER ], u[ POINTER ] + 4);
            u.set(0xAABBCCDD);
            assert.deepEqual(view, new Uint8Array([ 0xDD, 0xCC, 0xBB, 0xAA ])); // little endian
            assert.equal(u.get(), 0xAABBCCDD);
            u.set(0x11223344);
            assert.deepEqual(view, new Uint8Array([ 0x44, 0x33, 0x22, 0x11 ]));
            assert.equal(u.get(), 0x11223344);
        });

        it('should export reusable f64 pointer', () => {
            const f = geos.f1;
            const view = geos.U8.subarray(f[ POINTER ], f[ POINTER ] + 8);
            f.set(Math.PI);
            assert.deepEqual(view, new Uint8Array([ 24, 45, 68, 84, 251, 33, 9, 64 ]));
            assert.equal(f.get(), Math.PI);
            f.set(NaN);
            assert.deepEqual(view, new Uint8Array([ 0, 0, 0, 0, 0, 0, 0xF8, 0x7F ]));
            assert.equal(f.get(), NaN);
        });

        it('should export reusable buffer', () => {
            const free = mock.method(geos, 'free');

            // should export own reusable buffer
            const a = geos.buffByL(128);
            const b = geos.buffByL4(32);
            assert.equal(a, geos.buff);
            assert.equal(b, geos.buff);
            assert.equal(free.mock.callCount(), 0);
            a.freeIfTmp();
            b.freeIfTmp();
            assert.equal(free.mock.callCount(), 0);

            // should create a new temporary buffer when own buffer is too small
            const c = geos.buffByL(8192);
            const d = geos.buffByL4(2048);
            assert.notEqual(c, geos.buff);
            assert.notEqual(d, geos.buff);
            assert.equal(free.mock.callCount(), 0);
            c.freeIfTmp();
            d.freeIfTmp();
            assert.equal(free.mock.callCount(), 2);
            assert.deepEqual(free.mock.calls[ 0 ].arguments, [ c[ POINTER ] ]);
            assert.deepEqual(free.mock.calls[ 1 ].arguments, [ d[ POINTER ] ]);
        });

        it('should update memory views on memory grow', () => {
            const initialMemoryBuffer = geos.memory.buffer as any;
            const initialU8 = geos.U8;
            const initialU32 = geos.U32;
            const initialF64 = geos.F64;

            const coordinatesCount = 1_000_000; // 1_000_000 * 3 (GEOS always store xyz) * 8 = ~23MB
            const coordinates = new Float64Array(coordinatesCount * 2);
            const pts = Array.from<number[]>({ length: coordinatesCount });
            for (let i = 0, c = 0; i < coordinatesCount; i++) {
                pts[ i ] = [ coordinates[ c++ ] = Math.random(), coordinates[ c++ ] = Math.random() ];
            }

            assert.equal(initialMemoryBuffer.detached, false);
            const g = lineString(pts);

            assert.equal(initialMemoryBuffer.detached, true);
            assert.equal(initialMemoryBuffer.byteLength, 0);
            assert.equal((geos.memory.buffer as any).detached, false);

            assert.notEqual(initialU8, geos.U8);
            assert.notEqual(initialU32, geos.U32);
            assert.notEqual(initialF64, geos.F64);

            g.free();
        });

    });

    describe('table management', () => {

        it('should add function to the table and then remove it', () => {
            const dd_sample = (n: number) => n * 2;

            const initialTableLength = geos.table.length;
            const ddPtr = geos.addFunction(dd_sample, 'dd'); // 'dd' => (f64)->f64
            assert.equal(geos.table.length, initialTableLength + 1);
            assert.equal(ddPtr, initialTableLength);
            assert.equal(typeof geos.table.get(ddPtr), 'function');

            // should not duplicate
            const ddPtr2 = geos.addFunction(dd_sample, 'dd');
            assert.equal(ddPtr2, ddPtr);

            // test function
            assert.equal(geos.table.get(ddPtr)(11.3), 22.6);

            // remove function
            geos.removeFunction(dd_sample);
            assert.equal(geos.table.get(ddPtr), null);


            // add a new function when there is a free index in the table
            const ii_sample = (n: number) => n * 2;
            const iiPtr = geos.addFunction(ii_sample, 'ii'); // 'ii' => (i32)->i32
            assert.equal(geos.table.length, initialTableLength + 1); // has not grown
            assert.equal(iiPtr, initialTableLength); // the same as just removed dd function
            assert.equal(typeof geos.table.get(iiPtr), 'function');

            // test function
            assert.equal(geos.table.get(iiPtr)(11.3), 22); // double to int conversion

            // remove function
            geos.removeFunction(ii_sample);
            assert.equal(geos.table.get(iiPtr), null);
        });

    });

});
