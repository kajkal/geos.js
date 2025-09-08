import type { GEOSGeometry, GEOSPreparedGeometry, Ptr } from '../core/types/WasmGEOS.mjs';
import type { Point } from './types/Point.mjs';
import type { LineString } from './types/LineString.mjs';
import type { LinearRing } from './types/LinearRing.mjs';
import type { Polygon } from './types/Polygon.mjs';
import type { MultiPoint } from './types/MultiPoint.mjs';
import type { MultiLineString } from './types/MultiLineString.mjs';
import type { MultiPolygon } from './types/MultiPolygon.mjs';
import type { GeometryCollection } from './types/GeometryCollection.mjs';
import type { CircularString } from './types/CircularString.mjs';
import type { CompoundCurve } from './types/CompoundCurve.mjs';
import type { CurvePolygon } from './types/CurvePolygon.mjs';
import type { MultiCurve } from './types/MultiCurve.mjs';
import type { MultiSurface } from './types/MultiSurface.mjs';
import type { JSON_Feature, JSON_Geometry } from './types/JSON.mjs';
import { CLEANUP, FINALIZATION, P_CLEANUP, P_FINALIZATION, P_POINTER, POINTER } from '../core/symbols.mjs';
import { feature, jsonifyGeometry } from '../io/jsonify.mjs';
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

interface GEOSGeomTypeIdMap {
    Point: 0,
    LineString: 1,
    LinearRing: 2,
    Polygon: 3,
    MultiPoint: 4,
    MultiLineString: 5,
    MultiPolygon: 6,
    GeometryCollection: 7,
    CircularString: 8,
    CompoundCurve: 9,
    CurvePolygon: 10,
    MultiCurve: 11,
    MultiSurface: 12,
}

export const GEOSGeomTypeIdMap: GEOSGeomTypeIdMap = GEOSGeometryTypeDecoder.reduce((a, t, i) => (a[ t ] = i, a), {} as any);

export const CollectionElementsKeyMap: Record<string, string> = {
    [ GEOSGeometryTypeDecoder[ 7 ] ]: 'geometries',
    [ GEOSGeometryTypeDecoder[ 9 ] ]: 'segments',
    [ GEOSGeometryTypeDecoder[ 10 ] ]: 'rings',
    [ GEOSGeometryTypeDecoder[ 11 ] ]: 'curves',
    [ GEOSGeometryTypeDecoder[ 12 ] ]: 'surfaces',
};


export type CoordinateType = 'XY' | 'XYZ' | 'XYZM' | 'XYM';

export interface GeometryExtras<P> {

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
 * Union type of all possible geometry types.
 *
 * Each geometry type is an instance of {@link GeometryRef}.
 *
 * @template P - The type of optional data assigned to a geometry instance.
 */
export type Geometry<P = unknown> =
    Point<P> |
    LineString<P> |
    LinearRing<P> |
    Polygon<P> |
    MultiPoint<P> |
    MultiLineString<P> |
    MultiPolygon<P> |
    GeometryCollection<P> |
    CircularString<P> |
    CompoundCurve<P> |
    CurvePolygon<P> |
    MultiCurve<P> |
    MultiSurface<P>;


/**
 * Class representing a GEOS geometry that exists in the Wasm memory.
 *
 * @template P - The type of optional data assigned to a geometry instance.
 * Similar to the type of GeoJSON `Feature` properties field.
 */
export class GeometryRef<P = unknown> {

    /**
     * Geometry type
     *
     * @example #live
     * const type1 = fromWKT('POINT (1 1)').type; // 'Point'
     * const type2 = fromWKT('LINESTRING (0 0, 1 1)').type; // 'LineString'
     * const type3 = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)').type; // 'CircularString'
     */
    readonly type: GeometryType;

    /**
     * Geometry identifier, either number or string.
     *
     * Equivalent of GeoJSON feature id.
     */
    id?: number | string;

    /**
     * Geometry additional data.
     *
     * Equivalent of GeoJSON feature properties or GEOS geometry user data.
     */
    props: P;

    /**
     * Geometry can become detached when passed to a function that consumes
     * it, for example {@link geometryCollection}, or when manually
     * [freed]{@link GeometryRef#free}. Although this Geometry object still exists, the GEOS
     * object that it used to represent no longer exists.
     *
     * @example #live
     * const pt = point([ 0, 0 ]);
     * const before = pt.detached; // falsy (undefined)
     * pt.free(); // `pt` is no longer usable as a geometry
     * const after = pt.detached; // true
     */
    detached?: boolean;


    /**
     * Organizes the elements, rings, and coordinate order of geometries in a
     * consistent way, so that geometries that represent the same object can
     * be easily compared.
     *
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
     *
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
     * Creates a deep copy of this geometry object.
     *
     * @returns A new geometry that is a copy of this geometry
     *
     * @example
     * const original = point([ 0, 0 ]); // some geometry
     * const copy = original.clone();
     * // copy can be modified without affecting the original
     */
    clone(): GeometryRef<P> {
        const geomPtr = geos.GEOSGeom_clone(this[ POINTER ]);
        const copy = new GeometryRef<P>(geomPtr);
        if (this.id != null) {
            copy.id = this.id;
        }
        if (this.props != null) {
            copy.props = this.props; // shallow copy
        }
        return copy;
    }

    /**
     * Converts the geometry to a GeoJSON `Feature` object.
     *
     * This method allows the geometry to be serialized to JSON
     * and is automatically called by `JSON.stringify()`.
     *
     * `geom.toJSON()` is equivalent of calling
     * `toGeoJSON(geom, { flavor: 'extended', layout: 'XYZM' })`
     *
     * @returns A GeoJSON `Feature` representation of this geometry
     *
     * @see {@link toGeoJSON} converts geometry to a GeoJSON `Feature`
     * or a GeoJSON `FeatureCollection` object.
     *
     * @example #live
     * const geom = point([ 1, 2, 3 ]);
     * const geojson = geom.toJSON();
     * // {
     * //     type: 'Feature',
     * //     geometry: { type: 'Point', coordinates: [ 1, 2, 3 ] },
     * //     properties: null,
     * // }
     * const geojsonStr = JSON.stringify(geom);
     * // '{"type":"Feature","geometry":{"type":"Point","coordinates":[1,2,3]},"properties":null}'
     */
    toJSON(): JSON_Feature<JSON_Geometry, P> {
        return feature(this, jsonifyGeometry(this, 'XYZM', true));
    }

    /**
     * Frees the Wasm memory allocated for the GEOS geometry object.
     *
     * {@link GeometryRef} objects are automatically freed when they are out of scope.
     * This mechanism is provided by the [`FinalizationRegistry`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry}
     * that binds the lifetime of the Wasm resources to the lifetime of the JS objects.
     *
     * This method exists as a backup for those who find `FinalizationRegistry`
     * unreliable and want a way to free the memory manually.
     *
     * Use with caution, as when the object is manually freed, the underlying
     * Wasm resource becomes invalid and cannot be used anymore.
     *
     * @see {@link GeometryRef#detached}
     */
    free(): void {
        if (this[ P_POINTER ]) {
            GeometryRef[ P_FINALIZATION ].unregister(this);
            GeometryRef[ P_CLEANUP ](this[ P_POINTER ]);
        }
        GeometryRef[ FINALIZATION ].unregister(this);
        GeometryRef[ CLEANUP ](this[ POINTER ]);
        this.detached = true;
    }


    /** @internal */
    [ POINTER ]: Ptr<GEOSGeometry>;

    /** @internal */
    declare [ P_POINTER ]?: Ptr<GEOSPreparedGeometry>;

    /** @internal */
    constructor(ptr: Ptr<GEOSGeometry>, type?: typeof GEOSGeometryTypeDecoder[number], extras?: GeometryExtras<P>) {
        GeometryRef[ FINALIZATION ].register(this, ptr, this);
        this[ POINTER ] = ptr;
        this.type = type || GEOSGeometryTypeDecoder[ geos.GEOSGeomTypeId(ptr) ];
        if (extras) {
            if (extras.id != null) {
                this.id = extras.id;
            }
            if (extras.properties != null) {
                this.props = extras.properties;
            }
        }
    }

    /** @internal */
    static readonly [ FINALIZATION ] = (
        new FinalizationRegistry(GeometryRef[ CLEANUP ])
    );

    /** @internal */
    static readonly [ P_FINALIZATION ] = (
        new FinalizationRegistry(GeometryRef[ P_CLEANUP ])
    );

    /** @internal */
    static [ CLEANUP ](ptr: Ptr<GEOSGeometry>): void {
        geos.GEOSGeom_destroy(ptr);
    }

    /** @internal */
    static [ P_CLEANUP ](ptr: Ptr<GEOSPreparedGeometry>): void {
        geos.GEOSPreparedGeom_destroy(ptr);
    }

}
