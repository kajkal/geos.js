import React from 'react';
import clsx from 'clsx';
import copy from 'copy-text-to-clipboard';
import type L from 'leaflet';
import { circleMarker, CRS, divIcon, DomEvent, featureGroup, LatLng, LatLngBounds, marker } from 'leaflet';
import { GeoJSON, MapContainer, Popup, useMap } from 'react-leaflet';
import 'leaflet-rotatedmarker';
import { EvalCodeResult, FeatureData, LanguageJavaScript, ValueData } from '@site/src/utils/LanguageJavaScript';
import { Resizer } from '@site/src/components/Resizer';

import styles from './styles.module.css';


interface PreviewProps {
    js: LanguageJavaScript;
    code: string;
    className?: string;
    isMapOptional?: boolean;
}

type RenderErrorHandler = (error: Error, feature: FeatureData) => void;


export default function Preview(props: PreviewProps) {
    if (!window.geos) {
        throw window.geosPromise;
    }

    const { js, code } = props;
    const [ data, setData ] = React.useState(() => js.evalCode(code));

    React.useEffect(() => {
        setData(js.evalCode(code));
    }, [ code ]);

    const handleError: RenderErrorHandler = React.useCallback((error, feature) => {
        setData(prevState => ({
            ...prevState,
            errors: [ ...prevState.errors || [], error ],
            features: prevState.features.filter(f => f !== feature),
        }));
    }, []);

    // when no features in the first render = map is optional
    const isMapOptional = React.useMemo(() => props.isMapOptional ?? !data.features?.length, []);

    return (
        <div className={clsx(styles.preview, props.className)}>
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
    { children: React.ReactNode; f: FeatureData; onError: RenderErrorHandler; },
    { error?: Error; }
> {

    state = { error: null };

    static getDerivedStateFromError(error: any) {
        return { error };
    }

    componentDidCatch(error: any) {
        const { f } = this.props;
        error.name = `Cannot render geometry "${f.name}"`;
        error.WKT = window.geos.toWKT(f.geosGeom);
        this.props.onError(error, f);
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

interface ValuesPreviewProps {
    values?: ValueData[];
    label?: string;
    className?: string;
}

const ValuesPreview: React.FunctionComponent<ValuesPreviewProps> = ({ values, label = 'Outcome', className }) => {
    if (!values?.length) {
        return null;
    }
    return (
        <div className={clsx(styles.previewSection, className)}>
            <span className={styles.previewSectionBar}>{label}</span>
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
    const bounds = React.useMemo(() => new LatLngBounds([ [ y1, x1 ], [ y2, x2 ] ]), [ x1, y1, x2, y2 ]);

    React.useEffect(() => {
        map?.whenReady((e) => {
            e.target.fitBounds(bounds.pad(0.15), { animate: false });
        });
    }, [ map, bounds ]);

    React.useEffect(() => {
        if (map) {
            const ro = new ResizeObserver(() => {
                map.invalidateSize();
            });
            ro.observe(map.getContainer());
            return () => ro.disconnect();
        }
    }, [ map ]);

    const handleResize: React.PointerEventHandler = React.useCallback((e) => {
        const mapEl = map.getContainer();
        const rect = mapEl.getBoundingClientRect();
        const clickPoint = { y: e.clientY };

        const handlePointerMove = (e: PointerEvent) => {
            const dy = e.clientY - clickPoint.y;
            const newHeightInPx = rect.height + dy;
            mapEl.style.height = `${newHeightInPx}px`;
        };

        // set cursor
        document.body.style.cursor = 'ns-resize';
        mapEl.style.userSelect = 'none';
        mapEl.style.pointerEvents = 'none';

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', () => {
            document.removeEventListener('pointermove', handlePointerMove);

            // reset cursor
            document.body.style.removeProperty('cursor');
            mapEl.style.removeProperty('user-select');
            mapEl.style.removeProperty('pointer-events');
        }, { once: true });
    }, [ map ]);

    return (
        <div className={styles.previewSection}>
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
                    <GeoJSONErrorBoundary key={f.key} f={f} onError={onError}>
                        <GeoJSONFeature f={f} />
                    </GeoJSONErrorBoundary>
                ))}
                <VisibilityControl features={features} />
            </MapContainer>
            {map ? (
                <PositionControl map={map} />
            ) : null}
            <Resizer
                className={styles.mapPreviewSectionMapResizer}
                onPointerDown={handleResize}
            />
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
                    key={f.key}
                    title={f.geometry.type}
                    className={clsx(styles.checkboxLabel, styles.visibilityControlItem)}
                    onPointerEnter={() => f.layer.setStyle(hoverStyle)}
                    onPointerLeave={() => f.layer.setStyle(restStyle)}
                >
                    <input
                        type='checkbox'
                        defaultChecked
                        onChange={(e) => {
                            if (e.target.checked) {
                                map.addLayer(f.layer);
                            } else {
                                map.removeLayer(f.layer);
                            }
                        }}
                    />
                    {f.name}
                </label>
            ))}
        </div>
    );
};


const GeoJSONFeature: React.FunctionComponent<{ f: FeatureData; }> = ({ f }) => {
    const [ isVLayerVisible, onVLayerVisibilityChange ] = useVerticesLayer(f, false);
    const [ isDLayerVisible, onDLayerVisibilityChange ] = useDirectionLayer(f, false);
    return (
        <GeoJSON
            ref={el => {
                f.layer = el;
            }}
            data={f}
            style={defaultStyle}
            eventHandlers={featureLayerEventHandlers}
            pointToLayer={pointToLayer}
        >
            <FeaturePopup
                f={f}
                isVLayerVisible={isVLayerVisible}
                onVLayerVisibilityChange={onVLayerVisibilityChange}
                isDLayerVisible={isDLayerVisible}
                onDLayerVisibilityChange={onDLayerVisibilityChange}
            />
        </GeoJSON>
    );
};

const useVerticesLayer = (f: FeatureData, initialVisibility: boolean) => {
    const [ isVisible, setIsVisible ] = React.useState(initialVisibility);

    React.useEffect(() => {
        if (!isVisible) {
            if (f.vLayer) {
                f.layer.removeLayer(f.vLayer);
            }
            return;
        }

        if (!f.vLayer) {
            const outerVertexStyle: L.CircleMarkerOptions = {
                radius: 3.25,
                color: `var(--ifm-color-emphasis-700)`,
                fillColor: f.color,
                fillOpacity: 1,
                weight: 0.75,
                className: styles.vertex,
            };

            const innerVertexStyle: L.CircleMarkerOptions = {
                radius: 1.75,
                color: `var(--ifm-color-emphasis-700)`,
                fillColor: f.color,
                fillOpacity: 1,
                weight: 1.25,
                className: styles.vertex,
            };

            const xyTooltipOptions: L.TooltipOptions = {
                className: styles.vertexTooltip,
                direction: 'top',
                opacity: 1,
            };

            const vertexMarkers: L.CircleMarker[] = [];
            const addVertexMarkers = (pts: number[][], style: L.CircleMarkerOptions) => {
                for (const pt of pts) {
                    const x = String(pt[ 0 ]), y = String(pt[ 1 ]);
                    const marker = circleMarker(new LatLng(pt[ 1 ], pt[ 0 ], pt[ 2 ]), style)
                        .bindTooltip(`[ ${x}, ${y} ]`, xyTooltipOptions);
                    const diff = y.length - x.length;
                    if (diff) { // to align space between numbers
                        marker.on('tooltipopen', e => {
                            e.tooltip.getElement().style.marginLeft = `${diff / 2}ch`;
                        });
                    }
                    vertexMarkers.push(marker);
                }
            };

            const visitVertices = (geometry: ReturnType<typeof window.geos.Geometry.prototype.toJSON>['geometry']) => {
                switch (geometry.type) {
                    case 'Point': {
                        addVertexMarkers([ geometry.coordinates ], outerVertexStyle);
                        break;
                    }
                    case 'MultiPoint':
                    case 'LineString': {
                        const pts = geometry.coordinates;
                        addVertexMarkers(pts, outerVertexStyle);
                        break;
                    }
                    case 'MultiLineString':
                    case 'Polygon': {
                        const ppts = geometry.coordinates;
                        for (let i = 0; i < ppts.length; i++) {
                            addVertexMarkers(ppts[ i ], (i && geometry.type === 'Polygon') ? innerVertexStyle : outerVertexStyle);
                        }
                        break;
                    }
                    case 'MultiPolygon': {
                        const pppts = geometry.coordinates;
                        for (const ppts of pppts) {
                            for (let i = 0; i < ppts.length; i++) {
                                addVertexMarkers(ppts[ i ], i ? innerVertexStyle : outerVertexStyle);
                            }
                        }
                        break;
                    }
                    case 'GeometryCollection': {
                        for (const geom of geometry.geometries) {
                            visitVertices(geom);
                        }
                    }
                }
            };
            visitVertices(f.geometry);

            f.vLayer = featureGroup(vertexMarkers);
        }

        f.layer.addLayer(f.vLayer);
    }, [ f, isVisible ]);

    const handleVisibilityChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback((e) => {
        setIsVisible(e.target.checked);
    }, [ setIsVisible ]);

    return [ isVisible, handleVisibilityChange ] as const;
};

const useDirectionLayer = (f: FeatureData, initialVisibility: boolean) => {
    const [ isVisible, setIsVisible ] = React.useState(initialVisibility);

    React.useEffect(() => {
        if (!isVisible) {
            if (f.dLayer) {
                f.layer.removeLayer(f.dLayer);
            }
            return;
        }

        if (!f.dLayer) {
            const getArrowIcon = (path: string, stroke: string) => {
                const arrowSvg = `<svg viewBox='0 0 14 14'><path d='${path}' fill='none' stroke='${stroke}' stroke-width='1.5'/></svg>`;
                return divIcon({
                    className: 'arrow-icon',
                    html: arrowSvg,
                    iconSize: [ 14, 14 ],
                    iconAnchor: [ 7, 7 ],
                });
            };
            const outerArrowIcon = getArrowIcon('m4 2 7 5-7 5', f.color);
            const innerArrowIcon = getArrowIcon('m5 4 5 3-5 3', f.color);

            const arrows: L.Marker[] = [];
            const addArrows = (pts: number[][], icon: L.DivIcon) => {
                for (let i = 0; i < pts.length - 1; i++) {
                    const [ x1, y1 ] = pts[ i ], [ x2, y2 ] = pts[ i + 1 ];
                    const arrow = marker(new LatLng(y1 + (y2 - y1) / 3, x1 + (x2 - x1) / 3), {
                        icon,
                        interactive: false,
                        rotationAngle: -Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI,
                    } as (L.MarkerOptions & { rotationAngle: number; }));
                    arrows.push(arrow);
                }
            };

            const getArrows = (geometry: ReturnType<typeof window.geos.Geometry.prototype.toJSON>['geometry']) => {
                switch (geometry.type) {
                    case 'LineString': {
                        const pts = geometry.coordinates;
                        addArrows(pts, outerArrowIcon);
                        break;
                    }
                    case 'MultiLineString':
                    case 'Polygon': {
                        const ppts = geometry.coordinates;
                        for (let i = 0; i < ppts.length; i++) {
                            addArrows(ppts[ i ], (i && geometry.type === 'Polygon') ? innerArrowIcon : outerArrowIcon);
                        }
                        break;
                    }
                    case 'MultiPolygon': {
                        const pppts = geometry.coordinates;
                        for (const ppts of pppts) {
                            for (let i = 0; i < ppts.length; i++) {
                                addArrows(ppts[ i ], i ? innerArrowIcon : outerArrowIcon);
                            }
                        }
                        break;
                    }
                    case 'GeometryCollection': {
                        for (const geom of geometry.geometries) {
                            getArrows(geom);
                        }
                    }
                }
            };
            getArrows(f.geometry);

            f.dLayer = featureGroup(arrows);
        }

        f.layer.addLayer(f.dLayer);
    }, [ f, isVisible ]);

    const handleVisibilityChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback((e) => {
        setIsVisible(e.target.checked);
    }, [ setIsVisible ]);

    return [ isVisible, handleVisibilityChange ] as const;
};


interface FeaturePopupProps {
    f: FeatureData;
    isVLayerVisible: boolean;
    onVLayerVisibilityChange: React.ChangeEventHandler<HTMLInputElement>;
    isDLayerVisible: boolean;
    onDLayerVisibilityChange: React.ChangeEventHandler<HTMLInputElement>;
}

const FeaturePopup: React.FunctionComponent<FeaturePopupProps> = ({ f, ...props }) => {
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
                <code>{f.name}</code><i>{f.geometry.type}</i>
            </header>
            {f.geosGeom.id != null ? (
                <div className={clsx(styles.featurePopupId, styles.value)}>
                    <span>ID</span>: <strong className={styles.valueValue}>{JSON.stringify(f.geosGeom.id)}</strong>
                </div>
            ) : null}
            {f.geosGeom.props ? (
                <ValuesPreview
                    values={Object.entries(f.geosGeom.props)}
                    label='Properties'
                    className={clsx(styles.miniPreviewSection, styles.featurePopupProperties)}
                />
            ) : null}
            <ul className={styles.featurePopupActions}>
                <li>
                    <label className={clsx(styles.checkboxLabel, styles.featurePopupCheckbox)}>
                        <input
                            type='checkbox'
                            checked={props.isVLayerVisible}
                            onChange={props.onVLayerVisibilityChange}
                        />
                        show vertices
                    </label>
                </li>
                <li>
                    <label className={clsx(styles.checkboxLabel, styles.featurePopupCheckbox)}>
                        <input
                            type='checkbox'
                            checked={props.isDLayerVisible}
                            onChange={props.onDLayerVisibilityChange}
                        />
                        show directions
                    </label>
                </li>
                <li>
                    <button
                        className={clsx('button', 'button--outline', styles.featurePopupAction, isCopied === 'json' ? 'button--success' : 'button--secondary')}
                        onClick={() => {
                            copy(JSON.stringify(window.geos.toGeoJSON(f.geosGeom)));
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
                            copy(window.geos.toWKT(f.geosGeom));
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
    const f = feature as FeatureData;
    return {
        radius: 4,
        color: f.color,
        fillColor: f.color,
        fillOpacity: 0.3,
        opacity: 0.5,
        stroke: true,
        weight: 2,
    };
};

const hoverStyle: L.StyleFunction = (feature) => {
    if (feature?.constructor === FeatureData) {
        const f = feature as FeatureData;
        f.layer.bringToFront();
        if (f.dLayer && f.layer.hasLayer(f.dLayer)) {
            // workaround to make `.bringToFront()` work (more or less) for markers
            f.layer.removeLayer(f.dLayer);
            f.layer.addLayer(f.dLayer);
        }
        if (f.isActive) return;
        return {
            fillOpacity: 0.6,
            opacity: 1,
            color: 'var(--preview__active)',
            weight: 2.5,
        };
    }
};

const restStyle: L.StyleFunction = (feature) => {
    if (feature?.constructor === FeatureData) {
        const f = feature as FeatureData;
        if (f.isActive) return;
        return defaultStyle(feature);
    }
};

const activeStyle: L.StyleFunction = (feature) => {
    if (feature?.constructor === FeatureData) {
        const f = feature as FeatureData;
        f.isActive = true;
        return {
            fillOpacity: 0.85,
            opacity: 1,
            color: 'var(--preview__active)',
            weight: 2.5,
        };
    }
};

const resetActiveStyle: L.StyleFunction = (feature) => {
    if (feature?.constructor === FeatureData) {
        const f = feature as FeatureData;
        f.isActive = false;
        return defaultStyle(feature);
    }
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
