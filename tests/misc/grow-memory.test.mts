import assert from 'node:assert/strict';
import { before, beforeEach, describe, it, type Mock, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { growMemory } from '../../src/misc/grow-memory.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('growMemory', () => {

    let geos_memory_buffer_byteLength: Mock<() => typeof ArrayBuffer.prototype.byteLength>;
    let geos_memory_grow: Mock<typeof WebAssembly.Memory.prototype.grow>;
    let geos_updateMemory: Mock<typeof geos.updateMemory>;

    before(async () => {
        await initializeForTest();
    });

    beforeEach(() => {
        geos_memory_buffer_byteLength?.mock.restore();
        geos_memory_grow?.mock.restore();
        geos_updateMemory?.mock.restore();

        let byteLength = geos.memory.buffer.byteLength;
        geos_memory_buffer_byteLength = mock.getter(geos.memory.buffer, 'byteLength');
        geos_memory_grow = mock.method(geos.memory, 'grow', (delta) => {
            const prevPageCount = byteLength / (64 * 1024);
            byteLength += delta * (64 * 1024);
            geos_memory_buffer_byteLength.mock.mockImplementation(() => byteLength);
            return prevPageCount;
        });
        geos_updateMemory = mock.method(geos, 'updateMemory', () => undefined);
    });

    it('should grow Wasm memory \'by\' specified number of bytes', () => {
        const a = growMemory({ by: 512 * 1024 * 1024 }); // 512MB
        assert.equal(a, (16 * 1024 * 1024) + (512 * 1024 * 1024)); // 16MB + 512MB
        assert.equal(geos_memory_grow.mock.callCount(), 1);
        assert.deepEqual(geos_memory_grow.mock.calls[ 0 ].arguments, [ 8192 ]); // 512MB = 8192 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 1);

        const b = growMemory({ by: 256 * 1024 * 1024 }); // 256MB
        assert.equal(b, (16 * 1024 * 1024) + (512 * 1024 * 1024) + (256 * 1024 * 1024)); // 16MB + 512MB + 256MB
        assert.equal(geos_memory_grow.mock.callCount(), 2);
        assert.deepEqual(geos_memory_grow.mock.calls[ 1 ].arguments, [ 4096 ]); // 256MB = 4096 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 2);

        // should ignore 'grow by' with a negative delta
        const c = growMemory({ by: -512 * 1024 * 1024 }); // -512MB
        assert.equal(c, c); // no changes
        assert.equal(geos_memory_grow.mock.callCount(), 2); // no new calls
        assert.equal(geos_updateMemory.mock.callCount(), 2);
    });

    it('should limit grow Wasm memory \'by\' to 4GB', () => {
        const a = growMemory({ by: Infinity });
        assert.equal(a, (4 * 1024 * 1024 * 1024) - (64 * 1024)); // 4 GB - 64KB
        assert.equal(geos_memory_grow.mock.callCount(), 1);
        assert.deepEqual(geos_memory_grow.mock.calls[ 0 ].arguments, [ 65279 ]); // 4GB - 64KB (1 wasm page safety buffer) - 16MB (current memory) = 65279 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 1);
    });

    it('should grow Wasm memory \'to\' specified number of bytes', () => {
        const a = growMemory({ to: 256 * 1024 * 1024 }); // 256MB
        assert.equal(a, (256 * 1024 * 1024)); // 256MB
        assert.equal(geos_memory_grow.mock.callCount(), 1);
        assert.deepEqual(geos_memory_grow.mock.calls[ 0 ].arguments, [ 3840 ]); // 256MB - 16MB = 3840 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 1);

        const b = growMemory({ to: 512 * 1024 * 1024 }); // 512MB
        assert.equal(b, (512 * 1024 * 1024)); // 512MB
        assert.equal(geos_memory_grow.mock.callCount(), 2);
        assert.deepEqual(geos_memory_grow.mock.calls[ 1 ].arguments, [ 4096 ]); // 512MB - 256MB = 4096 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 2);

        // should ignore 'grow to' with a smaller/equal target size than the current one
        const c = growMemory({ to: 512 * 1024 * 1024 }); // 512MB
        assert.equal(c, b); // no changes
        assert.equal(geos_memory_grow.mock.callCount(), 2); // no new calls, already at 512MB
        assert.equal(geos_updateMemory.mock.callCount(), 2);
        const d = growMemory({ to: 128 * 1024 * 1024 }); // 128MB
        assert.equal(d, b); // no changes
        assert.equal(geos_memory_grow.mock.callCount(), 2); // no new calls
        assert.equal(geos_updateMemory.mock.callCount(), 2);
    });

    it('should limit grow Wasm memory \'to\' to 4GB', () => {
        const a = growMemory({ to: Infinity });
        assert.equal(a, (4 * 1024 * 1024 * 1024) - (64 * 1024)); // 4 GB - 64KB
        assert.equal(geos_memory_grow.mock.callCount(), 1);
        assert.deepEqual(geos_memory_grow.mock.calls[ 0 ].arguments, [ 65279 ]); // 4GB - 64KB - 16MB = 65279 wasm pages
        assert.equal(geos_updateMemory.mock.callCount(), 1);
    });

});
