import type { GEOSBufCapStyles, GEOSBufJoinStyles } from '../core/types/WasmGEOS.mjs';
import type { Polygon } from '../geom/types/Polygon.mjs';
import type { MultiPolygon } from '../geom/types/MultiPolygon.mjs';
import { POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


export interface BufferOptions {

    /**
     * The default number of facets into which to divide a fillet
     * of 90 degrees.
     *
     * A value of 8 gives less than 2% max error in the buffer distance.
     * For a max error of < 1%, use QS = 12.
     * For a max error of < 0.1%, use QS = 18.
     * The error is always less than the buffer distance.
     * @default 8
     */
    quadrantSegments?: number;

    /**
     * Cap styles control the ends of buffered lines.
     * - `round` - End is rounded, with end point of original line in the center of the round cap.
     * - `flat` - End is flat, with end point of original line at the end of the buffer.
     * - `square` - End is flat, with end point of original line in the middle of a square enclosing that point.
     * @default 'round'
     */
    endCapStyle?: 'round' | 'flat' | 'square';

    /**
     * Join styles control the buffer shape at bends in a line.
     * - `round` - Join is rounded, essentially each line is terminated in a round cap. Form round corner.
     * - `mitre` - Join is flat, with line between buffer edges, through the join point. Forms flat corner.
     * - `bevel` - Join is the point at which the two buffer edges intersect. Forms sharp corner.
     * @default 'round'
     */
    joinStyle?: 'round' | 'mitre' | 'bevel';

    /**
     * For acute angles, a mitre join can extend very very far from the input geometry,
     * which is probably not desired. The mitre limit places an upper bound on that.
     * @default 5.0
     */
    mitreLimit?: number;

    /**
     * Sets whether the computed buffer should be single-sided.
     * A single-sided buffer is constructed on only one side of each input line.
     *
     * The side used is determined by the sign of the buffer distance:
     * - a positive distance indicates the left-hand side
     * - a negative distance indicates the right-hand side
     *
     * The single-sided buffer of point geometries is the same as the regular buffer.
     *
     * The `endCapStyle` for single-sided buffers is always
     * ignored and forced to the equivalent of `flat`.
     * @default false
     */
    singleSided?: boolean;

}

/**
 * Creates a buffer around a geometry with a specified distance.
 * Distance is in input geometry units.
 *
 * @param geometry - The geometry to buffer
 * @param distance - The buffer distance. Positive values expand the geometry, negative values shrink it
 * @param options - Optional parameters to control buffer generation
 * @returns A new, buffered, geometry
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @example #live create a simple buffer around a point
 * const pt = point([ 0, 0 ]);
 * const circle = buffer(pt, 10);
 *
 * @example #live create a buffer around a line
 * const line = lineString([ [ 0, 0 ], [ 10, 10 ], [ 25, 10 ] ]);
 * const path1 = buffer(line, 2, { endCapStyle: 'square' });
 * const path2 = buffer(line, 4, { endCapStyle: 'flat' });
 *
 * @example #live create a buffer that shrinks the geometry
 * const poly = polygon([ [ [ 0, 0 ], [ 0, 8 ], [ 8, 8 ], [ 8, 0 ], [ 0, 0 ] ] ]);
 * const shrunken = buffer(poly, -2);
 * // shrunk to nothing
 * const empty1 = buffer(polygon([ [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 0 ] ] ]), -5); // 'POLYGON EMPTY'
 * // negative or zero-distance buffer of point or line - always empty
 * const empty2 = buffer(lineString([ [ 0, 0 ], [ 10, 10 ] ]), 0); // 'POLYGON EMPTY'
 * const empty3 = buffer(point([ 0, 0 ]), 0); // 'POLYGON EMPTY'
 */
export function buffer(geometry: Geometry, distance: number, options?: BufferOptions): Polygon | MultiPolygon {
    const cache = geos.b_p;
    const key = options
        ? [ options.quadrantSegments, options.endCapStyle, options.joinStyle, options.mitreLimit, options.singleSided ].join()
        : '';

    let paramsPtr = cache[ key ];
    if (!paramsPtr) {
        const ptr = geos.GEOSBufferParams_create();
        if (options) {
            const { quadrantSegments, endCapStyle, joinStyle, mitreLimit, singleSided } = options;
            if (quadrantSegments != null) {
                geos.GEOSBufferParams_setQuadrantSegments(ptr, quadrantSegments);
            }
            if (endCapStyle != null) {
                const endCapStyleMap: Record<Required<BufferOptions>['endCapStyle'], GEOSBufCapStyles> = {
                    round: 1,
                    flat: 2,
                    square: 3,
                };
                geos.GEOSBufferParams_setEndCapStyle(ptr, endCapStyleMap[ endCapStyle ]);
            }
            if (joinStyle != null) {
                const joinStyleMap: Record<Required<BufferOptions>['joinStyle'], GEOSBufJoinStyles> = {
                    round: 1,
                    mitre: 2,
                    bevel: 3,
                };
                geos.GEOSBufferParams_setJoinStyle(ptr, joinStyleMap[ joinStyle ]);
            }
            if (mitreLimit != null) {
                geos.GEOSBufferParams_setMitreLimit(ptr, mitreLimit);
            }
            if (singleSided != null) {
                geos.GEOSBufferParams_setSingleSided(ptr, +singleSided);
            }
        }
        paramsPtr = cache[ key ] = ptr;
    }

    const geomPtr = geos.GEOSBufferWithParams(geometry[ POINTER ], paramsPtr, distance);
    return new Geometry(geomPtr) as Polygon | MultiPolygon;
}
