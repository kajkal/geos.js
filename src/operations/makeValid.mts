import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


export interface MakeValidOptions {

    /**
     * Method used for fixing invalid geometries.
     * - `linework` - builds valid geometries by first extracting all lines,
     *   noding that linework together, then building a value output from the
     *   linework
     * - `structure` - is an algorithm that distinguishes between interior and
     *   exterior rings, building new geometry by unioning exterior rings, and
     *   then differencing all interior rings
     * @default 'linework'
     */
    method?: 'linework' | 'structure';

    /**
     * Only valid for the `structure` method.
     * When set to `false`, geometry components that collapse to a lower
     * dimensionality, for example, a one-point linestring would be dropped.
     * @default false
     */
    keepCollapsed?: boolean;

}

/**
 * Repairs an invalid geometry, returns a repaired, valid geometry.
 * Input geometries are always processed, so even valid inputs may
 * have some minor alterations. The output is always a new geometry object.
 *
 * @param geometry - The geometry to repair
 * @param [options] - Optional parameters to control the algorithm
 * @returns A new repaired geometry
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link isValid} checks whether a geometry is already valid
 *
 * @example #live
 * const poly = fromWKT('POLYGON ((2.22 2.28, 7.67 2.06, 10.98 7.7, 9.39 5, 7.96 7.12, 6.77 5.16, 7.43 6.24, 3.7 7.22, 5.72 5.77, 4.18 10.74, 2.2 6.83, 2.22 2.28))');
 * const valid1 = makeValid(poly);
 * const valid3 = makeValid(poly, { method: 'structure' });
 *
 * @example #live polygon with hole partially outside shell
 * const poly = polygon([ [ [ 0, 0 ], [ 0, 2 ], [ 2, 0 ], [ 0, 0 ] ], [ [ 0.5, 0.5 ], [ 2, 1 ], [ 2, 0.5 ], [ 0.5, 0.5 ] ] ]);
 * const valid1 = makeValid(poly);
 * const valid3 = makeValid(poly, { method: 'structure' });
 *
 * @example #live
 * const lineInDisguise = polygon([ [ [ 0, 0 ], [ 1, 1 ], [ 1, 2 ], [ 1, 1 ], [ 0, 0 ] ] ]);
 * const valid1 = makeValid(lineInDisguise);
 * // MULTILINESTRING ((0 0, 1 1), (1 1, 1 2))
 * const valid2 = makeValid(lineInDisguise, { method: 'structure', keepCollapsed: true });
 * // LINESTRING (0 0, 1 1, 1 2, 1 1, 0 0)
 * const valid3 = makeValid(lineInDisguise, { method: 'structure' });
 * // POLYGON EMPTY
 */
export function makeValid(geometry: Geometry, options?: MakeValidOptions): Geometry {
    const cache = geos.m_v;
    const key = options
        ? [ options.method, options.keepCollapsed ].join()
        : null;

    let paramsPtr = cache[ key ];
    if (!paramsPtr) {
        const ptr = geos.GEOSMakeValidParams_create();
        if (options) {
            const { method, keepCollapsed } = options;
            if (method != null) {
                geos.GEOSMakeValidParams_setMethod(ptr, method === 'structure' ? 1 : 0);
            }
            if (keepCollapsed != null) {
                geos.GEOSMakeValidParams_setKeepCollapsed(ptr, +keepCollapsed);
            }
        }
        paramsPtr = cache[ key ] = ptr;
    }

    const geomPtr = geos.GEOSMakeValidWithParams(geometry[ POINTER ], paramsPtr);
    return new Geometry(geomPtr);
}
