import type { Geometry as GeoJSONGeometry } from 'geojson';
import type { GEOSGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import { CLEANUP, FINALIZATION, POINTER } from '../core/symbols.mjs';
import { jsonifyGeometry } from '../io/jsonify.mjs';
import { geos } from '../core/geos.mjs';


export type GeometryType =
    'Point' |
    'LineString' |
    'LinearRing' |
    'Polygon' |
    'MultiPoint' |
    'MultiLineString' |
    'MultiPolygon' |
    'GeometryCollection' |
    'CircularString' |
    'CompoundCurve' |
    'CurvePolygon' |
    'MultiCurve' |
    'MultiSurface';

export const GEOSGeometryTypeDecoder = [
    /* 0 */ 'Point',
    /* 1 */ 'LineString',
    /* 2 */ 'LinearRing', // Not GeoJSON, GEOS geometry type for polygon rings
    /* 3 */ 'Polygon',
    /* 4 */ 'MultiPoint',
    /* 5 */ 'MultiLineString',
    /* 6 */ 'MultiPolygon',
    /* 7 */ 'GeometryCollection',
    // Not GeoJSON types:
    /* 8 */ 'CircularString',
    /* 9 */ 'CompoundCurve',
    /* 10 */ 'CurvePolygon',
    /* 11 */ 'MultiCurve',
    /* 12 */ 'MultiSurface',
] as const;


/**
 * Wrapper class for a GEOS geometry
 */
export class Geometry {

    /**
     * Geometry can become detached when passed to a function that consumes
     * it, for example {@link geometryCollection}, or when manually
     * [freed]{@link Geometry#free}. Although this Geometry object still exists, the GEOS
     * object that it used to represent no longer exists.
     */
    detached?: boolean;

    /** @internal */
    [ POINTER ]: Ptr<GEOSGeometry>;

    /** @internal */
    constructor(ptr: Ptr<GEOSGeometry>) {
        this[ POINTER ] = ptr;
        Geometry[ FINALIZATION ].register(this, ptr, this);
    }

    /**
     * Returns geometry type.
     */
    type(): GeometryType {
        const typeId = geos.GEOSGeomTypeId(this[ POINTER ]);
        return GEOSGeometryTypeDecoder[ typeId ];
    }

    /**
     * Organizes the elements, rings, and coordinate order of geometries in a
     * consistent way, so that geometries that represent the same object can
     * be easily compared.
     * Modifies the geometry in-place.
     *
     * Normalization ensures the following:
     * - Lines are oriented to have smallest coordinate first (apart from duplicate endpoints)
     * - Rings start with their smallest coordinate (using XY ordering)
     * - Polygon **shell** rings are oriented **CW**, and **holes CCW**
     * - Collection elements are sorted by their first coordinate
     *
     * Note the Polygon winding order, OGC standard uses the opposite convention
     * and so does GeoJSON. Polygon ring orientation could be changed via {@link orientPolygons}.
     *
     * @returns The same geometry but normalized, modified in-place
     */
    normalize(): this {
        geos.GEOSNormalize(this[ POINTER ]);
        return this;
    }

    /**
     * Enforces a ring orientation on all polygonal elements in the input geometry.
     * Polygon exterior ring can be oriented clockwise (CW) or counter-clockwise (CCW),
     * interior rings (holes) are oriented in the opposite direction.
     * Modifies the geometry in-place. Non-polygonal geometries will not be modified.
     *
     * @param [exterior='cw'] - Exterior ring orientation. Interior rings are
     * always oriented in the opposite direction.
     * @returns The same geometry but with oriented rings, modified in-place
     *
     * @example exterior ring CCW, holes CW (GeoJSON compliance)
     * polygonal = // (Multi)Polygon or GeometryCollection with some (Multi)Polygons
     * polygonal.orientPolygons('ccw');
     *
     * @example exterior ring CW, holes CCW
     * polygonal.orientPolygons('cw');
     */
    orientPolygons(exterior: 'cw' | 'ccw' = 'cw'): this {
        geos.GEOSOrientPolygons(this[ POINTER ], +(exterior === 'cw'));
        return this;
    }

    /**
     * Creates a deep copy of this Geometry object.
     *
     * @returns A new geometry that is a copy of this geometry
     *
     * @example
     * const original = // some geometry
     * const copy = original.clone();
     * // copy can be modified without affecting the original
     */
    clone(): Geometry {
        const geomPtr = geos.GEOSGeom_clone(this[ POINTER ]);
        return new Geometry(geomPtr);
    }

    /**
     * Converts the geometry to a GeoJSON geometry object.
     * This method allows the geometry to be serialized to JSON
     * and is automatically called by `JSON.stringify()`.
     *
     * @returns A GeoJSON geometry representation of this geometry
     *
     * @example converting a geometry to GeoJSON
     * const geojson = geometry.toJSON();
     *
     * @example using JSON.stringify()
     * const geojsonStr = JSON.stringify(geometry);
     */
    toJSON(): GeoJSONGeometry {
        return jsonifyGeometry(this);
    }


    /** @internal */
    static readonly [ FINALIZATION ] = (
        new FinalizationRegistry(Geometry[ CLEANUP ])
    );

    /** @internal */
    static [ CLEANUP ](ptr: Ptr<GEOSGeometry>): void {
        geos.GEOSGeom_destroy(ptr);
    }

    free(): void {
        Geometry[ FINALIZATION ].unregister(this);
        Geometry[ CLEANUP ](this[ POINTER ]);
        this.detached = true;
    }

}
