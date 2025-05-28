/**
 * Base error class for all `geos.js` errors.
 *
 * Errors that originate from C/C++/Wasm code are thrown as instances of this class.
 * More specific errors are thrown as instances of one of the subclasses of this class.
 */
export class GEOSError extends Error {
    /** @internal */
    constructor(message: string) {
        super(message);
        this.name = 'GEOSError';
    }
}
