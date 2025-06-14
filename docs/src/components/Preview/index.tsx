import React from 'react';
import clsx from 'clsx';
import copy from 'copy-text-to-clipboard';
import type L from 'leaflet';
import { circleMarker, CRS, DomEvent, latLngBounds } from 'leaflet';
import { GeoJSON, MapContainer, Popup, useMap } from 'react-leaflet';
import { ACTIVE, COLOR, EvalCodeResult, FeatureData, GGEOM, KEY, LanguageJavaScript, LAYER, ValueData } from '@site/src/utils/LanguageJavaScript';

import styles from './styles.module.css';


interface PreviewProps {
    js: LanguageJavaScript;
    code: string;
    className?: string;
}

type RenderErrorHandler = (error: Error, id: string) => void;


export default function Preview({ js, code, className }: PreviewProps) {
    if (!window.geos) {
        throw window.geosPromise;
    }

    const [ data, setData ] = React.useState(() => js.evalCode(code));

    React.useEffect(() => {
        setData(js.evalCode(code));
    }, [ code ]);

    const handleError: RenderErrorHandler = React.useCallback((error, id) => {
        setData(prevState => ({
            ...prevState,
            errors: [ ...prevState.errors || [], error ],
            features: prevState.features.filter(f => f.id !== id),
        }));
    }, []);

    // when no features in the first render = map is optional
    const isMapOptional = React.useMemo(() => !data.features?.length, []);

    return (
        <div className={clsx(styles.preview, className)}>
            {(isMapOptional && !data.features?.length) ? null : (
                <MapPreview
                    features={data.features}
                    bbox={data.bbox}
                    onError={handleError}
                />
            )}
            <ValuesPreview values={data.values} />
            <ErrorsPreview errors={data.errors} />
        </div>
    );
}


class GeoJSONErrorBoundary extends React.Component<
    { children: React.ReactNode; data: FeatureData; onError: RenderErrorHandler; },
    { error?: Error; }
> {

    state = { error: null };

    static getDerivedStateFromError(error: any) {
        return { error };
    }

    componentDidCatch(error: any) {
        const { data } = this.props;
        error.name = `Cannot render geometry "${data.id}"`;
        error.WKT = window.geos.toWKT(data[ GGEOM ]);
        this.props.onError(error, data.id);
    }

    render() {
        if (this.state.error) {
            return null;
        }
        return this.props.children;
    }

}


/** errors */

const ErrorsPreview: React.FunctionComponent<{ errors?: Error[]; }> = ({ errors }) => {
    if (!errors?.length) {
        return null;
    }
    return (
        <>
            {errors.map((error, i) => {
                const { name, message, ...rest } = error;
                const props = Object.entries(rest);
                return (
                    <div className={clsx(styles.previewSection, styles.errorPreviewSection)} key={i}>
                        <span className={styles.previewSectionBar}>{name}</span>
                        <pre className={styles.previewSectionBody}>
                            <span>{message}</span>
                            {props.length ? (
                                <div className={styles.errorProps}>
                                    {props.map(entry => (
                                        <ValuePreview key={entry[ 0 ]} entry={entry} />
                                    ))}
                                </div>
                            ) : null}
                        </pre>
                    </div>
                );
            })}
        </>
    );
};


/** values */

const specialValues = new Map([
    [ NaN, 'NaN' ],
    [ Infinity, 'Infinity' ],
    [ -Infinity, '-Infinity' ],
    [ undefined, 'undefined' ],
]);

const ValuePreview: React.FunctionComponent<{ entry: ValueData; }> = ({ entry: [ key, value ] }) => {
    if (value instanceof Uint8Array) {
        value = `<Uint8Array ${Array.from(value, e => e.toString(16).padStart(2, '0')).join('')}>`;
    } else {
        value = specialValues.get(value) || JSON.stringify(value);
    }
    return (
        <div className={styles.value}>
            <span className={styles.valueName}>{key}</span>: <span className={styles.valueValue}>{value}</span>{'\n'}
        </div>
    );
};

const ValuesPreview: React.FunctionComponent<{ values?: ValueData[] }> = ({ values }) => {
    if (!values?.length) {
        return null;
    }
    return (
        <div className={styles.previewSection}>
            <span className={styles.previewSectionBar}>Outcome</span>
            <pre className={styles.previewSectionBody}>
                {values.map((entry) => (
                    <ValuePreview key={entry[ 0 ]} entry={entry} />
                ))}
            </pre>
        </div>
    );
};


/** features */

interface MapPreviewProps {
    features?: EvalCodeResult['features'];
    bbox: EvalCodeResult['bbox'];
    onError: RenderErrorHandler;
}

const MapPreview: React.FunctionComponent<MapPreviewProps> = ({ features = [], bbox: [ x1, y1, x2, y2 ], onError }) => {
    const [ map, setMap ] = React.useState<L.Map>(null);
    const bounds = React.useMemo(() => latLngBounds([ [ y1, x1 ], [ y2, x2 ] ]), [ x1, y1, x2, y2 ]);

    React.useEffect(() => {
        map?.whenReady((e) => {
            e.target.fitBounds(bounds.pad(0.15), { animate: false });
        });
    }, [ map, bounds ]);

    return (
        <div className={clsx(styles.previewSection, styles.mapPreviewSection)}>
            <MapContainer
                ref={setMap}
                className={styles.mapPreviewSectionMap}
                crs={CRS.Simple}
                center={bounds.getCenter()}
                minZoom={-16}
                zoom={3}
                zoomSnap={0.1}
                zoomControl={false}
                inertia={false}
            >
                {features.map((f) => (
                    <GeoJSONErrorBoundary key={f[ KEY ]} data={f} onError={onError}>
                        <GeoJSON
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
                    </GeoJSONErrorBoundary>
                ))}
                <VisibilityControl features={features} />
            </MapContainer>
            {map ? (
                <PositionControl map={map} />
            ) : null}
        </div>
    );
};

const PositionControl: React.FunctionComponent<{ map: L.Map }> = ({ map }) => {
    const [ zoom, setZoom ] = React.useState(map.getZoom());
    const [ position, setPosition ] = React.useState(map.getCenter());

    React.useEffect(() => {
        function handleZoomLevelChange(e) {
            setZoom(e.target.getZoom());
        }

        function handleMouseMove(e) {
            setPosition(e.latlng); // lng-x lat-y
        }

        map.on('zoom', handleZoomLevelChange);
        map.on('mousemove', handleMouseMove);
        return () => {
            map.off('zoom', handleZoomLevelChange);
            map.off('mousemove', handleMouseMove);
        };
    }, [ map ]);

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
        <div className={clsx(styles.previewSectionBar, styles.positionControl)}>
            zoom
            <span title='zoom level' className={styles.zoom}>{zoom.toFixed(1)}</span>
            |
            <span title='x' className={styles.xy}>{position.lng.toFixed(digits)}</span>
            <span title='y' className={styles.xy}>{position.lat.toFixed(digits)}</span>
        </div>
    );
};

const VisibilityControl: React.FunctionComponent<{ features: FeatureData[] }> = ({ features }) => {
    const map = useMap();
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        DomEvent.disableScrollPropagation(ref.current);
    }, []);

    return (
        <div
            ref={ref}
            className={styles.visibilityControl}
            onDoubleClickCapture={(e) => void e.stopPropagation()}
        >
            {features.map((f) => (
                <label
                    key={f.id}
                    title={f.geometry.type}
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

const FeaturePopup: React.FunctionComponent<{ f: FeatureData }> = ({ f }) => {
    const [ isCopied, setIsCopied ] = React.useState<'wkt' | 'json' | false>(false);

    React.useEffect(() => {
        if (isCopied) {
            let timeoutId = window.setTimeout(() => {
                setIsCopied(false);
            }, 200);
            return () => window.clearTimeout(timeoutId);
        }
    }, [ isCopied ]);

    return (
        <Popup className={styles.featurePopup}>
            <header className={styles.featurePopupHeader}>
                <code>{f.id}</code><i>{f.geometry.type}</i>
            </header>
            <ul className={styles.featurePopupActions}>
                <li>
                    <button
                        className={clsx('button', 'button--outline', styles.featurePopupAction, isCopied === 'json' ? 'button--success' : 'button--secondary')}
                        onClick={() => {
                            copy(JSON.stringify(f.geometry));
                            setIsCopied('json');
                        }}
                    >
                        copy as GeoJSON
                    </button>
                </li>
                <li>
                    <button
                        className={clsx('button', 'button--outline', styles.featurePopupAction, isCopied === 'wkt' ? 'button--success' : 'button--secondary')}
                        onClick={() => {
                            copy(window.geos.toWKT(f[ GGEOM ]));
                            setIsCopied('wkt');
                        }}
                    >
                        copy as WKT
                    </button>
                </li>
            </ul>
        </Popup>
    );
};

const defaultStyle: L.StyleFunction = (feature) => {
    return {
        radius: 4,
        color: `var(--preview__${feature[ COLOR ]})`,
        fillColor: `var(--preview__${feature[ COLOR ]})`,
        fillOpacity: 0.3,
        opacity: 0.5,
        stroke: true,
        weight: 2,
    };
};

const hoverStyle: L.StyleFunction = (feature) => {
    feature[ LAYER ].bringToFront();
    if (feature[ ACTIVE ]) return;
    return {
        fillOpacity: 0.6,
        opacity: 1,
        color: 'var(--preview__active)',
        weight: 2.5,
    };
};

const restStyle: L.StyleFunction = (feature) => {
    if (feature[ ACTIVE ]) return;
    return defaultStyle(feature);
};

const activeStyle: L.StyleFunction = (feature) => {
    feature[ ACTIVE ] = true;
    return {
        fillOpacity: 0.85,
        opacity: 1,
        color: 'var(--preview__active)',
        weight: 2.5,
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
