import { geos } from '../core/geos.mjs';


/**
 * Returns GEOS version.
 *
 * @returns string with the version of GEOS and GEOS C-API
 *
 * @example #live
 * const v = version(); // '3.13.1-CAPI-1.19.2'
 */
export function version(): string {
    const strPtr = geos.GEOSversion();
    return geos.decodeString(strPtr);
}
