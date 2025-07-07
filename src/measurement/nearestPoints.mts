import type { Point } from '../geom/types/Point.mjs';
import type { Prepared } from '../geom/PreparedGeometry.mjs';
import { P_POINTER, POINTER } from '../core/symbols.mjs';
import { GEOSError } from '../core/GEOSError.mjs';
import { type Geometry, GeometryRef } from '../geom/Geometry.mjs';
import { isEmpty } from '../predicates/isEmpty.mjs';
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
 * @see {@link distance} computes the distance between two geometries
 * @see {@link distanceWithin} returns `true` when two geometries are within a given distance
 * @see {@link prepare} improves performance of repeated calls against a single geometry
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
 *
 * @example to improve performance of repeated calls against a single geometry
 * const a = buffer(point([ 0, 0 ]), 10, { quadrantSegments: 1000 });
 * // `a` is a polygon with many vertices (4000 in this example)
 * prepare(a);
 * // preparation of geometry `a` will improve the performance of repeated
 * // `nearestPoints` calls, but only those where `a` is the first geometry
 * const r1 = nearestPoints(a, point([ 12, 0 ]));
 * const r2 = nearestPoints(a, point([ 12, 1 ]));
 * const r3 = nearestPoints(point([ 12, 2 ]), a); // no benefit from prepared geometry
 */
export function nearestPoints(a: Geometry | Prepared<Geometry>, b: Geometry): [ a: Point, b: Point ] {
    const cs = a[ P_POINTER ]
        ? geos.GEOSPreparedNearestPoints(a[ P_POINTER ], b[ POINTER ])
        : geos.GEOSNearestPoints(a[ POINTER ], b[ POINTER ]);
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
            new GeometryRef(a_pt, 'Point') as Point,
            new GeometryRef(b_pt, 'Point') as Point,
        ];
    }
    if (isEmpty(a) || isEmpty(b)) {
        throw new GEOSError('"nearestPoints" called with empty inputs');
    }
    throw new GEOSError('Curved geometry types are not supported.');
}
