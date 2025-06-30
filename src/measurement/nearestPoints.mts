import type { Point } from '../geom/types/Point.mjs';
import { POINTER } from '../core/symbols.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Finds the nearest points between geometry `a` and geometry `b`.
 *
 * The returned points can be points along a line segment, not necessarily
 * one of the vertices of the input geometries.
 *
 * @param a - First geometry
 * @param b - Second geometry
 * @returns An array with two point geometries, first is the nearest point
 * from the geometry `a` second from the geometry `b`
 * @throws {GEOSError} on unsupported geometry types (curved)
 * @throws {GEOSError} when either geometry is empty
 *
 * @see {@link distance} to calculate the distance between two geometries
 *
 * @example #live nearest points between point and line
 * const a = point([ 0, 0 ]);
 * const b = lineString([ [ 0, 1 ], [ 1, 0 ] ]);
 * const [ a_pt, b_pt ] = nearestPoints(a, b); // [ <POINT (0 0)>, <POINT (0.5 0.5)> ]
 *
 * @example #live nearest points between two polygons
 * const a = polygon([ [ [ 0, 0 ], [ 0, 2 ], [ 1, 0 ], [ 0, 0 ] ] ]);
 * const b = polygon([ [ [ 1, 1 ], [ 2, 1 ], [ 2, 2 ], [ 1, 2 ], [ 1, 1 ] ] ]);
 * const [ a_pt, b_pt ] = nearestPoints(a, b); // [ <POINT (0.6 0.8)>, <POINT (1 1)> ]
 */
export function nearestPoints(a: Geometry, b: Geometry): [ a: Point, b: Point ] {
    const cs = geos.GEOSNearestPoints(a[ POINTER ], b[ POINTER ]);
    if (cs) {
        const x = geos.f1, y = geos.f2;

        geos.GEOSCoordSeq_getXY(cs, 0, x[ POINTER ], y[ POINTER ]);
        const a_pt = geos.GEOSGeom_createPointFromXY(x.get(), y.get());
        geos.GEOSSetSRID(a_pt, geos.GEOSGetSRID(a[ POINTER ]));

        geos.GEOSCoordSeq_getXY(cs, 1, x[ POINTER ], y[ POINTER ]);
        const b_pt = geos.GEOSGeom_createPointFromXY(x.get(), y.get());
        geos.GEOSSetSRID(b_pt, geos.GEOSGetSRID(b[ POINTER ]));

        geos.GEOSCoordSeq_destroy(cs);

        return [
            new Geometry(a_pt, 'Point') as Point,
            new Geometry(b_pt, 'Point') as Point,
        ];
    }
    throw new GEOSError('"nearestPoints" called with empty inputs');
}
