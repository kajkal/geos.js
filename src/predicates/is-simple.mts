import type { Geometry } from '../geom/geometry.mjs';
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
 * @param g - Geometry
 * @returns `true` when geometry is simple, `false` otherwise
 * @throws {GeosError} on unsupported geometry types (curved)
 *
 * @see {@link isValid} checks whether a geometry is well-formed
 *
 * @example
 * isSimple(lineString([ [ 0, 0 ], [ 2, 2 ], [ 1, 2 ], [ 1, 0 ] ])); // false - self-intersection
 * isSimple(multiLineString([ [ [ 0, 1 ], [ 2, 1 ] ], [ [ 0, 0 ], [ 2, 1 ] ] ])); // true - intersection at endpoints is ok
 * isSimple(lineString([ [ -1, -1 ], [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ])); // false - intersection not at the endpoints
 * isSimple(lineString([ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ])); // true - ring
 */
export function isSimple(g: Geometry): boolean {
    return Boolean(geos.GEOSisSimple(g[ POINTER ]));
}
