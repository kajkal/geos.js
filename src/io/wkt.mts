import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/geometry.mjs';
import { geos } from '../core/geos.mjs';


export interface WKTInputOptions {

    /**
     * Automatically repair structural errors in the input (currently just unclosed rings) while reading.
     * @default false
     */
    fix?: boolean;

}

/**
 * Creates a Geometry object from Well-Known Text (WKT) representation.
 *
 * @param wkt - String containing WKT representation of the geometry
 * @param options - WKT input configuration
 * @returns A new Geometry object created from the WKT string
 * @throws GeosError on invalid WKT string
 *
 * @example basic usage
 * const point = fromWKT('POINT(1 1)');
 * const line = fromWKT('LINESTRING(0 0, 1 1, 2 2)');
 * const polygon = fromWKT('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))');
 *
 * @example with options
 * const polygon = fromWKT('POLYGON((0 0, 1 0, 1 1))', { fix: true }); // will fix unclosed ring
 *
 * @see {@link https://libgeos.org/specifications/wkt}
 */
export function fromWKT(wkt: string, options?: WKTInputOptions): Geometry {
    const cache = geos.t_r;
    const key = options
        ? [ options.fix ].join()
        : null;

    let readerPtr = cache[ key ];
    if (!readerPtr) {
        const ptr = geos.GEOSWKTReader_create();
        if (options) {
            const { fix } = options;
            if (fix != null) {
                geos.GEOSWKTReader_setFixStructure(ptr, +fix);
            }
        }
        readerPtr = cache[ key ] = ptr;
    }

    const buff = geos.encodeString(wkt);
    try {
        const geomPtr = geos.GEOSWKTReader_read(readerPtr, buff[ POINTER ]);
        return new Geometry(geomPtr);
    } finally {
        buff.freeIfTmp();
    }
}


export interface WKTOutputOptions {

    /**
     * Output dimensionality of the writer.
     * @default 4
     */
    dim?: 2 | 3 | 4;

    /**
     * Number places after the decimal to output in WKT.
     * @default 16
     */
    precision?: number;

    /**
     * Trim trailing 0's from the output coordinates.
     * @default true
     */
    trim?: boolean;

}

/**
 * Converts a Geometry object to its Well-Known Text (WKT) representation.
 *
 * @param geometry - The geometry object to be converted to WKT
 * @param options - WKT output configuration
 * @returns String with WKT representation of the geometry
 *
 * @example basic usage
 * const pt = point([ 1.1234, 1.9876, 10 ]);
 * const wkt = toWKT(pt); // 'POINT Z (1.1234 1.9876 10)'
 *
 * @example with options
 * const pt = point([ 1.1234, 1.9876, 10 ]);
 * const wkt = toWKT(pt, {
 *     dim: 2, // xy
 *     precision: 2, // decimal places
 * }); // 'POINT (1.12 1.99)'
 *
 * @see {@link https://libgeos.org/specifications/wkt}
 */
export function toWKT(geometry: Geometry, options?: WKTOutputOptions): string {
    const cache = geos.t_w;
    const key = options
        ? [ options.dim, options.precision, options.trim ].join()
        : null;

    let writerPtr = cache[ key ];
    if (!writerPtr) {
        const ptr = geos.GEOSWKTWriter_create();
        if (options) {
            const { dim, precision, trim } = options;
            if (dim != null) {
                geos.GEOSWKTWriter_setOutputDimension(ptr, dim);
            }
            if (precision != null) {
                geos.GEOSWKTWriter_setRoundingPrecision(ptr, precision);
            }
            if (trim != null) {
                geos.GEOSWKTWriter_setTrim(ptr, +trim);
            }
        }
        writerPtr = cache[ key ] = ptr;
    }

    const strPtr = geos.GEOSWKTWriter_write(writerPtr, geometry[ POINTER ]);
    const str = geos.decodeString(strPtr);
    geos.free(strPtr);
    return str;
}
