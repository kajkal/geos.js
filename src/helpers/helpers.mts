import type { Position } from 'geojson';
import { FINALIZATION, POINTER } from '../core/symbols.mjs';
import { Geometry } from '../geom/Geometry.mjs';
import { geosifyGeometry } from '../io/geosify.mjs';
import { geos } from '../core/geos.mjs';
import type { Point } from '../geom/types/Point.mjs';
import type { GeometryCollection } from '../geom/types/GeometryCollection.mjs';
import type { MultiPolygon } from '../geom/types/MultiPolygon.mjs';
import type { MultiLineString } from '../geom/types/MultiLineString.mjs';
import type { MultiPoint } from '../geom/types/MultiPoint.mjs';
import type { Polygon } from '../geom/types/Polygon.mjs';
import type { LineString } from '../geom/types/LineString.mjs';


export interface GeometryOptions<P> {

    /**
     * Optional identifier to be assigned to the geometry instance.
     */
    id?: number | string;

    /**
     * Optional data to be assigned to the geometry instance.
     */
    properties?: P;

}


/**
 * Creates a {@link Point} geometry from a position.
 *
 * @param pt - Point coordinates
 * @param options - Optional geometry options
 * @returns A new point Geometry object
 *
 * @example #live
 * const a = point([ 0, 0 ]);
 * const b = point([ 2, 0 ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'POINT (0 0)'
 */
export function point<P>(pt: Position, options?: GeometryOptions<P>): Point<P> {
    return geosifyGeometry({ type: 'Point', coordinates: pt }, options) as Point<P>;
}


/**
 * Creates a {@link LineString} geometry from an array of positions.
 *
 * Line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param pts - LineString coordinates
 * @param options - Optional geometry options
 * @returns A new Geometry object
 * @throws {InvalidGeoJSONError} on line with 1 position
 *
 * @example #live
 * const a = lineString([ [ 0, 0 ], [ 2, 1 ], [ 0, 2 ] ]);
 * const b = lineString([ [ 2, 0 ], [ 4, 0 ] ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'LINESTRING (0 0, 2 1, 0 2)'
 */
export function lineString<P>(pts: Position[], options?: GeometryOptions<P>): LineString<P> {
    return geosifyGeometry({ type: 'LineString', coordinates: pts }, options) as LineString<P>;
}


/**
 * Creates a {@link Polygon} geometry from an array of linear rings coordinates.
 *
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param ppts - Polygon coordinates
 * @param options - Optional geometry options
 * @returns A new Geometry object
 * @throws {InvalidGeoJSONError} if any ring is invalid (not closed or with 1 or 2 positions)
 *
 * @example #live
 * const a = polygon([ [ [ 4, 3 ], [ 5, 4 ], [ 5, 3 ], [ 4, 3 ] ] ]);
 * const b = polygon([
 *     [ [ 0, 0 ], [ 0, 8 ], [ 8, 8 ], [ 8, 0 ], [ 0, 0 ] ],
 *     [ [ 2, 2 ], [ 6, 6 ], [ 6, 2 ], [ 2, 2 ] ],
 * ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'POLYGON ((4 3, 5 4, 5 3, 4 3))'
 */
export function polygon<P>(ppts: Position[][], options?: GeometryOptions<P>): Polygon<P> {
    return geosifyGeometry({ type: 'Polygon', coordinates: ppts }, options) as Polygon<P>;
}


/**
 * Creates a {@link MultiPoint} geometry from an array of positions.
 *
 * @param pts - MultiPoint coordinates
 * @param options - Optional geometry options
 * @returns A new Geometry object
 *
 * @example #live
 * const a = multiPoint([ [ 0, 0 ], [ 2, 0 ], [ 4, 0 ] ]);
 * const b = multiPoint([ [ 1, 0 ], [ 3, 0 ] ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'MULTIPOINT ((0 0), (2 0), (4 0))'
 */
export function multiPoint<P>(pts: Position[], options?: GeometryOptions<P>): MultiPoint<P> {
    return geosifyGeometry({ type: 'MultiPoint', coordinates: pts }, options) as MultiPoint<P>;
}


/**
 * Creates a {@link MultiLineString} geometry from an array of line strings coordinates.
 *
 * Each line string must contain at least 2 positions.
 * Empty line strings with 0 positions are allowed.
 *
 * @param ppts - MultiLineString coordinates
 * @param options - Optional geometry options
 * @returns A new Geometry object
 * @throws {InvalidGeoJSONError} on line with 1 position
 *
 * @example #live
 * const a = multiLineString([
 *     [ [ -10, 3 ], [ 5, 4 ] ],
 *     [ [ -10, 7 ], [ 5, 6 ] ],
 * ]);
 * const b = multiLineString([
 *     [ [ 0, 0 ], [ 10, 5 ], [ 0, 10 ] ],
 *     [ [ 1, 0 ], [ 12, 5 ], [ 1, 10 ] ],
 * ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'MULTILINESTRING ((-10 3, 5 4), (-10 7, 5 6))'
 */
export function multiLineString<P>(ppts: Position[][], options?: GeometryOptions<P>): MultiLineString<P> {
    return geosifyGeometry({ type: 'MultiLineString', coordinates: ppts }, options) as MultiLineString<P>;
}


/**
 * Creates a {@link MultiPolygon} geometry from an array of polygon coordinates.
 *
 * Each polygon must consist of an array of linear rings coordinates.
 * The first ring represents the exterior ring (shell), subsequent rings
 * represent interior rings (holes). Each ring must be a closed line string
 * with first and last positions identical and contain at least 3 positions.
 * Empty polygons without any rings are allowed.
 *
 * @param pppts - MultiPolygon coordinates
 * @param options - Optional geometry options
 * @returns A new Geometry object
 * @throws {InvalidGeoJSONError} if any ring is invalid (not closed or with 1 or 2 positions)
 *
 * @example #live
 * const a = multiPolygon([
 *     [ [ [ 1, 0 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ] ] ],
 *     [ [ [ 1, 1 ], [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ] ],
 * ]);
 * const b = multiPolygon([
 *     [ [ [ 0, 1 ], [ 1, 2 ], [ 1, 1 ], [ 0, 1 ] ] ],
 *     [ [ [ 1, 0 ], [ 1, 1 ], [ 2, 1 ], [ 1, 0 ] ] ],
 * ], { properties: { name: 'B' } });
 * const wkt = toWKT(a); // 'MULTIPOLYGON (((1 0, 0 1, 1 1, 1 0)), ((1 1, 1 2, 2 1, 1 1)))'
 */
export function multiPolygon<P>(pppts: Position[][][], options?: GeometryOptions<P>): MultiPolygon<P> {
    return geosifyGeometry({ type: 'MultiPolygon', coordinates: pppts }, options) as MultiPolygon<P>;
}


/**
 * Creates a {@link GeometryCollection} geometry from an array of geometries.
 *
 * The collection consumes the input geometries - after creating
 * the collection, the input geometries become {@link Geometry#detached|detached},
 * are no longer valid and should **not** be used.
 *
 * @param geometries - Array of geometry objects to be included in the collection
 * @param options - Optional geometry options
 * @returns A new GeometryCollection containing all input geometries
 *
 * @example #live
 * const a = polygon([ [ [ 4, 1 ], [ 4, 3 ], [ 8, 2 ], [ 4, 1 ] ] ]);
 * const b = lineString([ [ 0, 2 ], [ 6, 2 ] ]);
 * const c = geometryCollection([ a, b ]);
 * const wkt = toWKT(c); // 'GEOMETRYCOLLECTION (POLYGON ((4 1, 4 3, 8 2, 4 1)), LINESTRING (0 2, 6 2))'
 */
export function geometryCollection<P>(geometries: Geometry[], options?: GeometryOptions<P>): GeometryCollection<P> {
    const geometriesLength = geometries.length;
    const buff = geos.buffByL4(geometriesLength);
    try {
        let B = geos.U32, b = buff.i4;
        for (const geometry of geometries) {
            B[ b++ ] = geometry[ POINTER ];
        }
        const geomPtr = geos.GEOSGeom_createCollection(7, buff[ POINTER ], geometriesLength);
        for (const geometry of geometries) {
            Geometry[ FINALIZATION ].unregister(geometry);
            geometry.detached = true;
        }
        return new Geometry(geomPtr, 'GeometryCollection', options) as GeometryCollection<P>;
    } finally {
        buff.freeIfTmp();
    }
}
