import { geos } from '../core/geos.mjs';


/**
 * For performance optimization.
 * Increases the size of the `WebAssembly.Memory` _by_ or _to_ a specified
 * number of bytes.
 *
 * Internally, the number of bytes will be rounded up to the closest multiple
 * of 64KB - WebAssembly page size.
 *
 * When you know you will need a larger chunk of memory, 500MB for example,
 * you can reserve it in advance. Otherwise, Wasm memory would increase
 * dynamically in multiple steps, which could affect performance
 * as with each step `WebAssembly.Memory` views must be recreated -
 * [detachment upon growing]{@link https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow#detachment_upon_growing}.
 *
 * The initial `WebAssembly.Memory` size is 16MB and grows dynamically
 * up to the 4GB limit.
 *
 * @param options - Object with either `by` or `to` property
 * @param options.by - By how many bytes the memory will grow; incremental step
 * @param options.to - To how many bytes the memory will grow; target value
 * @returns The new size of the memory, in bytes
 *
 * @example grow memory by 512MB
 * growMemory({ by: 512 * 1024 * 1024 });
 *
 * @example grow memory to 1GB
 * growMemory({ to: 1204 * 1024 * 1024 });
 *
 * @example reserve all available memory (limited to 4GB for wasm32 target)
 * growMemory({ to: Infinity });
 *
 * @example get current memory size
 * growMemory({ by: 0 });
 */
export function growMemory(options: { by: number } | { to: number }): number {
    const currentByteCount = geos.memory.buffer.byteLength;
    const targetByteCount = 'by' in options ? currentByteCount + options.by : options.to;
    const currentPageCount = currentByteCount / 65536; // 65536 = 64 * 1024 = 64KB = wasm page size
    const targetPageCount = Math.min(65535, Math.ceil(targetByteCount / 65536)); // 65535 pages = 4GB - 64KB = max page count
    const pagesToGrow = targetPageCount - currentPageCount;
    if (pagesToGrow > 0) {
        geos.memory.grow(pagesToGrow);
        geos.updateMemory();
    }
    return geos.memory.buffer.byteLength;
}
