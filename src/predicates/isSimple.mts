import type { Geometry } from '../geom/Geometry.mjs';
import { POINTER } from '../core/symbols.mjs';
import { geos } from '../core/geos.mjs';


/**
 * Returns `true` when the geometry is simple as defined by the OGC SFS
 * (Simple Feature Specification).
 * Simple means that any self-intersections are only at boundary points.
 * Mostly relevant for line strings.
 *
 * Simplicity is defined for each Geometry type as follows:
 * - Point geometries are simple
 * - MultiPoint geometries are simple if every point is unique
 * - LineString geometries are simple if they do not self-intersect at interior
 *   points (i.e. points other than the endpoints). LinearRings - closed line
 *   strings which intersect only at their endpoints are simple
 * - MultiLineString geometries are simple if their elements are simple and
 *   they intersect only at points which are boundary points of both elements
 * - Polygonal geometries have no definition of simplicity.
 *   The `isSimple` code checks if all polygon rings are simple.
 *   This means that isSimple cannot be used to test for ALL self-intersections
 *   in Polygons. Use {@link isValid} to check polygonal geometries for
 *   self-intersections
 * - GeometryCollection geometries are simple if all their elements are simple
 * - Empty geometries are simple
 *
 * @param geometry - The geometry to check
 * @returns `true` when geometry is simple, `false` otherwise
 * @throws {GEOSError} on unsupported geometry types (curved)
 *
 * @see {@link isValid} checks whether a geometry is well-formed
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 2, 2 ], [ 1, 2 ], [ 1, 0 ] ]);
 * const a_simple = isSimple(a); // false - self-intersection
 *
 * const b = multiLineString([ [ [ 2, 0 ], [ 4, 2 ] ], [ [ 3, 2 ], [ 4, 2 ] ] ]);
 * const b_simple = isSimple(b); // true - intersection at endpoints is ok
 *
 * const c = lineString([ [ 4, 0 ], [ 5, 1 ], [ 5, 2 ], [ 6, 1 ], [ 5, 1 ] ]);
 * const c_simple = isSimple(c); // false - intersection not at the endpoints
 *
 * const d = lineString([ [ 7, 1 ], [ 7, 2 ], [ 8, 1 ], [ 7, 1 ] ]);
 * const d_simple = isSimple(d); // true - ring
 */
export function isSimple(geometry: Geometry): boolean {
    return Boolean(geos.GEOSisSimple(geometry[ POINTER ]));
}
