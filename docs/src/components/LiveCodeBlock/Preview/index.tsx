import React from 'react';
import clsx from 'clsx';
import type L from 'leaflet';
import { circleMarker, CRS, latLngBounds } from 'leaflet';
import { GeoJSON, MapContainer, Popup, useMap, useMapEvents } from 'react-leaflet';

import styles from './styles.module.css';


const GGEOM = Symbol('geos-geom');
const LAYER = Symbol('layer');
const ACTIVE = Symbol('is-active');
const COLOR = Symbol('i');


interface ValueData {
    n: string; // variable name
    v: string; // stringifyed value
}

interface FeatureData {
    id: string; // variable name
    type: 'Feature';
    properties: object;
    geometry: ReturnType<typeof window.geos.Geometry.prototype.toJSON>;
    [ COLOR ]: number;
    [ GGEOM ]?: InstanceType<typeof window.geos.Geometry>;
    [ LAYER ]?: L.GeoJSON;
}

interface PreviewProps {
    features: FeatureData[];
    values: ValueData[];
    bounds: L.LatLngBounds;
}


const RENDERABLE = new Set([
    'Point', 'MultiPoint',
    'LineString', 'MultiLineString',
    'Polygon', 'MultiPolygon',
    'GeometryCollection',
]);


/**
 * A function to call from "Live Editor" to display values and render geometries.
 * @param props - parameters provided in the "Live Editor" live code
 */
export function preview(props: any): React.ReactNode {
    const features: FeatureData[] = [];
    const values: ValueData[] = [];

    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    let i = 0;

    for (const n in props) {
        const v = props[ n ];
        if (v instanceof window.geos.Geometry) {
            if (!RENDERABLE.has(v.type()) || window.geos.isEmpty(v)) {
                values.push({ n, v: JSON.stringify(window.geos.toWKT(v)) });
            } else {
                features.push({
                    id: n,
                    type: 'Feature',
                    properties: {},
                    geometry: v.toJSON(),
                    [ COLOR ]: (i++) % 8,
                    [ GGEOM ]: v,
                });
                const bbox = window.geos.bounds(v);
                x1 = Math.min(x1, bbox[ 0 ]);
                y1 = Math.min(y1, bbox[ 1 ]);
                x2 = Math.max(x2, bbox[ 2 ]);
                y2 = Math.max(y2, bbox[ 3 ]);
            }
        } else {
            values.push({ n, v: JSON.stringify(v) });
        }
    }

    return React.createElement(Preview, {
        values,
        features,
        bounds: latLngBounds(
            x1 === x2 && y1 === y2
                ? [ [ y1 - 1, x1 - 1 ], [ y2 + 1, x2 + 1 ] ] // otherwise `fitBounds` do not work properly
                : [ [ y1, x1 ], [ y2, x2 ] ],
        ),
    });
}


const Preview: React.FunctionComponent<PreviewProps> = ({ values, features, bounds }) => {
    const [ map, setMap ] = React.useState<L.Map>(null);

    React.useEffect(() => {
        map?.whenReady((e) => {
            e.target.fitBounds(bounds, {
                paddingTopLeft: [ 30, 30 ], // left top
                paddingBottomRight: [ 30, 10 ], // right bottom
                animate: false,
            });
        });
    }, [ map ]);

    return (
        <>
            {values.length ? (
                <pre className={styles.valuesContainer}>
                    {values.map(({ n, v }) => (
                        <React.Fragment key={n}>
                            <b>{n}: </b><span>{v}</span>{'\n'}
                        </React.Fragment>
                    ))}
                </pre>
            ) : null}
            {features.length ? (
                <MapContainer
                    ref={setMap}
                    className={styles.mapContainer}
                    crs={CRS.Simple}
                    center={bounds.getCenter()}
                    minZoom={-16}
                    zoom={3}
                    zoomSnap={0.1}
                    zoomControl={false}
                    inertia={false}
                >
                    {features.map((f) => (
                        <GeoJSON
                            key={f.id}
                            ref={el => {
                                f[ LAYER ] = el;
                            }}
                            data={f}
                            style={defaultStyle}
                            eventHandlers={featureLayerEventHandlers}
                            pointToLayer={pointToLayer}
                        >
                            <FeaturePopup f={f} />
                        </GeoJSON>
                    ))}
                    <PositionControl />
                    <VisibilityControl features={features} />
                </MapContainer>
            ) : null}
        </>
    );
};

const FeaturePopup: React.FunctionComponent<{ f: FeatureData }> = ({ f }) => {
    return (
        <Popup className={styles.featurePopup}>
            <header className={styles.featurePopupHeader}>
                <code>{f.id}</code><i>{f.geometry.type}</i>
            </header>
            <ul className={styles.featurePopupActions}>
                <li>
                    <button
                        className={clsx('button', 'button--outline', 'button--secondary', styles.featurePopupAction)}
                        onClick={() => void navigator.clipboard.writeText(JSON.stringify(f.geometry))}
                    >
                        copy as GeoJSON
                    </button>
                </li>
                <li>
                    <button
                        className={clsx('button', 'button--outline', 'button--secondary', styles.featurePopupAction)}
                        onClick={() => void navigator.clipboard.writeText(window.geos.toWKT(f[ GGEOM ]))}
                    >
                        copy as WKT
                    </button>
                </li>
            </ul>
        </Popup>
    );
};

const PositionControl: React.FunctionComponent = () => {
    const map = useMap();
    const [ zoom, setZoom ] = React.useState(map.getZoom());
    const [ position, setPosition ] = React.useState(map.getCenter());

    useMapEvents({
        zoom: (e) => {
            setZoom(e.target.getZoom());
        },
        mousemove: (e) => {
            setPosition(e.latlng); // lng-x lat-y
        },
    });

    let digits = 0;
    if (zoom > 10) {
        digits = 6;
    } else if (zoom > 8) {
        digits = 4;
    } else if (zoom > 6) {
        digits = 2;
    } else if (zoom > 2) {
        digits = 1;
    }

    return (
        <div
            className={styles.positionControl}
            onDoubleClickCapture={(e) => void e.stopPropagation()}
        >
            <span>zoom {zoom.toFixed(1).padEnd(4, ' ')}</span>
            <span>|</span>
            <span>{position.lng.toFixed(digits).padStart(9, ' ')}</span>
            <span>{position.lat.toFixed(digits).padStart(9, ' ')}</span>
        </div>
    );
};

const VisibilityControl: React.FunctionComponent<{ features: FeatureData[] }> = ({ features }) => {
    const map = useMap();
    return (
        <div
            className={styles.visibilityControl}
            onDoubleClickCapture={(e) => void e.stopPropagation()}
        >
            {features.map((f) => (
                <label
                    key={f.id}
                    className={styles.visibilityControlItem}
                    onPointerEnter={() => f[ LAYER ].setStyle(hoverStyle)}
                    onPointerLeave={() => f[ LAYER ].setStyle(restStyle)}
                >
                    <input
                        type='checkbox'
                        defaultChecked
                        onChange={(e) => {
                            if (e.target.checked) {
                                map.addLayer(f[ LAYER ]);
                            } else {
                                map.removeLayer(f[ LAYER ]);
                            }
                        }}
                    />
                    {f.id}
                </label>
            ))}
        </div>
    );
};


const defaultStyle: L.StyleFunction = (feature) => {
    if (feature.geometry.type === 'Point') {
        return {
            radius: 4,
            fillOpacity: 0.5,
            opacity: 0.65,
            color: `var(--preview__${feature[ COLOR ]})`,
            fillColor: `var(--preview__${feature[ COLOR ]})`,
            stroke: false,
            weight: 2,
        } satisfies L.CircleMarkerOptions;
    }
    return {
        color: `var(--preview__${feature[ COLOR ]})`,
        fillColor: `var(--preview__${feature[ COLOR ]})`,
        fillOpacity: 0.3,
        opacity: 0.65,
        weight: 2,
        stroke: true,
    };
};

const hoverStyle: L.StyleFunction = (feature) => {
    if (feature[ ACTIVE ]) return;
    feature[ LAYER ].bringToFront();
    return {
        fillOpacity: 0.4,
        opacity: 1,
        color: 'var(--preview__active)',
        stroke: true,
    };
};

const restStyle: L.StyleFunction = (feature) => {
    if (feature[ ACTIVE ]) return;
    return defaultStyle(feature);
};

const activeStyle: L.StyleFunction = (feature) => {
    feature[ ACTIVE ] = true;
    return {
        fillOpacity: 0.7,
        opacity: 1,
        color: 'var(--preview__active)',
        stroke: true,
    };
};

const resetActiveStyle: L.StyleFunction = (feature) => {
    feature[ ACTIVE ] = false;
    return defaultStyle(feature);
};


const pointToLayer: L.GeoJSONOptions['pointToLayer'] = (_geoJsonPoint, latlng) => {
    return circleMarker(latlng);
};


const featureLayerEventHandlers: L.LeafletEventHandlerFnMap = {
    mouseover: (e) => {
        e.target.setStyle(hoverStyle);
    },
    mouseout: (e) => {
        e.target.setStyle(restStyle);
    },
    popupopen: (e) => {
        e.target.setStyle(activeStyle);
    },
    popupclose: (e) => {
        e.target.setStyle(resetActiveStyle);
    },
};
