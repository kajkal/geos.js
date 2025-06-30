import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


export interface WKBInputOptions {

    /**
     * Automatically repair structural errors in the input (currently just unclosed rings) while reading.
     * @default false
     */
    fix?: boolean;

}

/**
 * Creates a {@link Geometry} from Well-Known Binary (WKB) representation.
 *
 * @param wkb - Binary data containing WKB representation of the geometry
 * @param options - Optional WKB input configuration
 * @returns A new geometry object created from the WKB data
 * @throws {GEOSError} on invalid WKB data
 *
 * @see {@link https://libgeos.org/specifications/wkb}
 *
 * @example #live
 * const wkb = new Uint8Array([
 *     1, // 1 - LE
 *     1, 0, 0, 0, // 1 - point
 *     105, 87, 20, 139, 10, 191, 5, 64, // Math.E - x
 *     24, 45, 68, 84, 251, 33, 9, 64, // Math.PI - y
 * ]);
 * const pt = fromWKB(wkb); // point([ Math.E, Math.PI ]);
 */
export function fromWKB(wkb: Uint8Array, options?: WKBInputOptions): Geometry {
    const cache = geos.b_r;
    const key = options
        ? [ options.fix ].join()
        : '';

    let readerPtr = cache[ key ];
    if (!readerPtr) {
        const ptr = geos.GEOSWKBReader_create();
        if (options) {
            const { fix } = options;
            if (fix != null) {
                geos.GEOSWKBReader_setFixStructure(ptr, +fix);
            }
        }
        readerPtr = cache[ key ] = ptr;
    }

    const wkbLen = wkb.length;
    const buff = geos.buffByL(wkbLen);
    try {
        geos.U8.set(wkb, buff[ POINTER ]);
        const geomPtr = geos.GEOSWKBReader_read(readerPtr, buff[ POINTER ], wkbLen);
        return new Geometry(geomPtr);
    } finally {
        buff.freeIfTmp();
    }
}


export interface WKBOutputOptions {

    /**
     * Output dimensionality of the writer.
     * @default 4
     */
    dim?: 2 | 3 | 4;

    /**
     * Output flavor of the writer.
     * - [`extended`]{@link https://libgeos.org/specifications/wkb/#extended-wkb}
     * - [`iso`]{@link https://libgeos.org/specifications/wkb/#iso-wkb}
     * @default 'extended'
     */
    flavor?: 'extended' | 'iso';

    /**
     * Output byte order of the writer.
     * Little/Big Endian.
     * @default 'le'
     */
    byteOrder?: 'le' | 'be';

    /**
     * Whether SRID values should be output in WKB.
     * Many WKB readers do not support SRID values, use with caution.
     * @default false
     */
    srid?: boolean;

}

/**
 * Converts a geometry object to its Well-Known Binary (WKB) representation.
 *
 * @param geometry - The geometry object to be converted to WKB
 * @param options - Optional WKB output configuration
 * @returns A Uint8Array containing the WKB representation of the geometry
 *
 * @see {@link https://libgeos.org/specifications/wkb}
 *
 * @example #live
 * const pt = point([ Math.E, Math.PI, 1 ]);
 * const wkb1 = toWKB(pt); // Uint8Array([...])
 * const wkb2 = toWKB(pt, { dim: 2 }); // Uint8Array([...])
 */
export function toWKB(geometry: Geometry, options?: WKBOutputOptions): Uint8Array {
    const cache = geos.b_w;
    const key = options
        ? [ options.dim, options.flavor, options.byteOrder, options.srid ].join()
        : '';

    let writerPtr = cache[ key ];
    if (!writerPtr) {
        const ptr = geos.GEOSWKBWriter_create();
        if (options) {
            const { dim, flavor, byteOrder, srid } = options;
            if (dim != null) {
                geos.GEOSWKBWriter_setOutputDimension(ptr, dim);
            }
            if (flavor != null) {
                geos.GEOSWKBWriter_setFlavor(ptr, flavor === 'iso' ? 2 : 1);
            }
            if (byteOrder != null) {
                geos.GEOSWKBWriter_setByteOrder(ptr, byteOrder === 'be' ? 0 : 1);
            }
            if (srid != null) {
                geos.GEOSWKBWriter_setIncludeSRID(ptr, +srid);
            }
        }
        writerPtr = cache[ key ] = ptr;
    }

    const len = geos.u1;
    const ptr = geos.GEOSWKBWriter_write(writerPtr, geometry[ POINTER ], len[ POINTER ]);
    const wkb = geos.U8.slice(ptr, ptr + len.get());
    geos.free(ptr);
    return wkb;
}
