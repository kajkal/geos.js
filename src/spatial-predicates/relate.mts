import type { Geometry } from '../geom/Geometry.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Computes the [DE-9IM]{@link https://en.wikipedia.org/wiki/DE-9IM} string for
 * a pair of geometries `a` and `b`.
 *
 * The result is a 9-character string described by the regular expression
 * `/^[F012]{9}$/`.\
 * Each character represents a dimension of intersection:
 * - `F` - no intersection (-1 dimension)
 * - `0` - point
 * - `1` - line
 * - `2` - area
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns DE-9IM matrix string for the spacial relationship between
 * geometries `a` and `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link relatePattern} returns `true` if spatial relationship between
 * two geometries matches the specified pattern
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const b = lineString([ [ 0, 0 ], [ 1, 0 ] ]);
 * const ab_relate = relate(a, b); // 'F0FFFF102'
 * const ba_relate = relate(b, a); // 'FF10F0FF2'
 */
export function relate(a: Geometry | Prepared<Geometry>, b: Geometry): string {
    const strPtr = a[ P_POINTER ]
        ? geos.GEOSPreparedRelate(a[ P_POINTER ], b[ POINTER ])
        : geos.GEOSRelate(a[ POINTER ], b[ POINTER ]);
    const str = geos.decodeString(strPtr);
    geos.free(strPtr);
    return str;
}


/**
 * Returns `true` if the spatial relationship between geometries `a` and `b`
 * matches the specified [DE-9IM]{@link https://en.wikipedia.org/wiki/DE-9IM}
 * pattern.
 *
 * DE-9IM pattern is a 9-character string described by the regular expression
 * `/^[F012T*]{9}$/`.\
 * Each character represents a dimension of intersection:
 * - `F` - no intersection (-1 dimension)
 * - `0` - point
 * - `1` - line
 * - `2` - area
 * - `T` - any intersection (`0`, `1` or `2`)
 * - `*` - wildcard (`F`, `0`, `1` or `2`)
 *
 * If possible it is better to use a named relationship functions like
 * {@link overlaps} or {@link covers}.
 *
 * Warning:
 *   Do not use this function with [invalid]{@link isValid} geometries.
 *   You will get unexpected results.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @param pattern - DE-9IM pattern, 9-character string where each character is
 * one of `F`,`0`,`1`,`2`,`T`,`*`
 * @returns `true` if the specified pattern matches the spatial relationship
 * between geometries `a` and `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link relate} returns the exact DE-9IM matrix string for two geometries
 * @see {@link prepare} improves performance of repeated calls against a single geometry
 *
 * @example #live
 * const a = polygon([ [ [ 0, 0 ], [ 0, 7 ], [ 4, 7 ], [ 4, 0 ], [ 0, 0 ] ] ]);
 * const b = polygon([ [ [ 2, 1 ], [ 2, 4 ], [ 8, 4 ], [ 8, 1 ], [ 2, 1 ] ] ]);
 * const ab_relation = relate(a, b); // '212101212'
 * const ab_overlaps = relatePattern(a, b, 'T*T***T**'); // true - `a` overlaps `b`, probably
 * const ab_contains = relatePattern(a, b, 'T*****FF*'); // false - `a` do not contain `b`
 */
export function relatePattern(a: Geometry | Prepared<Geometry>, b: Geometry, pattern: string): boolean {
    const buff = geos.encodeString(pattern);
    return Boolean(
        a[ P_POINTER ]
            ? geos.GEOSPreparedRelatePattern(a[ P_POINTER ], b[ POINTER ], buff[ POINTER ])
            : geos.GEOSRelatePattern(a[ POINTER ], b[ POINTER ], buff[ POINTER ]),
    );
}
