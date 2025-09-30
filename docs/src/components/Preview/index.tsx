import React from 'react';
import clsx from 'clsx';
import copy from 'copy-text-to-clipboard';
import { useColorMode } from '@docusaurus/theme-common';
import { Feature, Renderer, RenderResult } from '@site/src/components/Preview/renderer/Renderer';
import { EvalCodeResult, LanguageJavaScript, Var } from '@site/src/utils/LanguageJavaScript';
import { palettes } from '@site/src/components/Preview/renderer/styles';
import { Resizer } from '@site/src/components/Resizer';

import styles from './styles.module.css';


export interface MapOptions {
    v: boolean; // whether vertices are visible
    d: boolean; // whether direction arrows are visible
}

type VisualizationResult = EvalCodeResult & RenderResult;


interface PreviewProps {
    js: LanguageJavaScript;
    code: string;
    mapAlwaysVisible?: boolean;
    mapOptions?: MapOptions;
    className?: string;
}

export default function Preview({ js, code, className, mapAlwaysVisible, mapOptions }: PreviewProps) {
    if (!window.geos) {
        throw window.geosPromise;
    }

    const rendererRef = React.useRef<Renderer | null>(null);
    const isFirstRenderRef = React.useRef<boolean>(true);
    const [ evalStatus, setEvalStatus ] = React.useState<0 | 1>(0); // 0 - default; 1 - success
    const [ data, setData ] = React.useState<VisualizationResult>(() => js.evalCode(code));

    // when no features in the first render -> map is optional
    const isMapOptional = React.useMemo(() => !mapAlwaysVisible && !data.featureVars?.length, []);

    React.useEffect(() => {
        let evalResult: EvalCodeResult;
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            evalResult = data;
        } else {
            evalResult = js.evalCode(code);
        }

        setData(evalResult);

        if (!evalResult.evalError) {
            setEvalStatus(1);
            let timeoutId = setTimeout(() => {
                setEvalStatus(0);
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [ code ]);

    React.useEffect(() => {
        const featureVars = data.featureVars;
        const renderer = rendererRef.current;
        if (renderer && featureVars) {
            const { logs } = renderer.render(featureVars);
            setData(data => ({ ...data, logs }));
        }
    }, [ data.featureVars ]);

    return (
        <div className={clsx(styles.preview, className)}>
            {isMapOptional && !data.featureVars?.length ? null : (
                <GeometriesPreview
                    evalStatus={data.evalError ? 2 : evalStatus}
                    mapOptions={mapOptions}
                    ref={rendererRef}
                />
            )}
            {(data.evalError ? (
                <ErrorPreview error={data.evalError} />
            ) : null)}
            <RenderErrorsAndWarningsPreview logs={data.logs} />
            <ValuesPreview values={data.vars} />
        </div>
    );
}


const ValuePreview: React.FunctionComponent<Var> = ({ name, value }) => {
    if (value instanceof Uint8Array) {
        value = `<Uint8Array ${Array.from(value, toHex).join('')}>`;
    } else {
        value = specialValues.get(value) || JSON.stringify(value);
    }
    return (
        <span className={styles.value} data-var={name}>
            {value}
        </span>
    );
};

const toHex = (n: number): string => n.toString(16).padStart(2, '0');
const specialValues = new Map([
    [ NaN, 'NaN' ],
    [ Infinity, 'Infinity' ],
    [ -Infinity, '-Infinity' ],
    [ undefined, 'undefined' ],
]);


interface ValuesPreviewProps {
    values?: Var[];
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
                {values.map(({ name, value }) => (
                    <ValuePreview key={name} name={name} value={value} />
                ))}
            </pre>
        </div>
    );
};


interface ErrorPreviewProps {
    error: Error;
}

const ErrorPreview: React.FunctionComponent<ErrorPreviewProps> = ({ error }) => {
    const { name, message, ...rest } = error;
    const props = Object.entries(rest);
    return (
        <div className={clsx(styles.previewSection, styles.errorPreviewSection)}>
            <span className={styles.previewSectionBar}>{name}</span>
            <pre className={styles.previewSectionBody}>
                <span>{message}</span>
                {props.length ? (
                    <div className={styles.errorProps}>
                        {props.map(([ name, value ]) => (
                            <ValuePreview key={name} name={name} value={value} />
                        ))}
                    </div>
                ) : null}
            </pre>
        </div>
    );
};


interface RenderWarningsPreviewProps {
    logs?: Feature[];
}

const RenderErrorsAndWarningsPreview: React.FunctionComponent<RenderWarningsPreviewProps> = ({ logs }) => {
    if (!logs?.length) {
        return null;
    }
    return (
        <div className={clsx(styles.previewSection, styles.renderErrorsAndWarningsPreviewSection)}>
            <span className={styles.previewSectionBar}>Rendering Errors & Warnings</span>
            <dl className={styles.previewSectionBody}>
                {logs.map(d => (
                    d.error
                        ? <RenderErrorPreview key={d.name} d={d} />
                        : <RenderWarningsPreview key={d.name} d={d} />
                ))}
            </dl>
        </div>
    );
};

const RenderErrorPreview: React.FunctionComponent<{ d: Feature; }> = ({ d }) => {
    return (
        <>
            <dt>
                <span className={styles.logTypeIcon} title='Render error'>💥</span>
                <code className='beefy-code'>{d.name}</code>
            </dt>
            <dd>
                <span className={styles.logSummary}>Cannot render geometry</span>
                <span className={styles.logDetails}>{d.error!.message}</span>
                <span className={styles.logWKT}>{window.geos.toWKT(d.geom)}</span>
            </dd>
        </>
    );
};

const RenderWarningsPreview: React.FunctionComponent<{ d: Feature; }> = ({ d }) => {
    return (
        <>
            <dt>
                <span className={styles.logTypeIcon} title='Render warning'>⚠️</span>
                <code className='beefy-code'>{d.name}</code>
            </dt>
            {d.warnings!.map((w, i) => (
                <dd key={i}>
                    <span className={styles.logSummary}>{w.message}</span>
                    {w.details ? (
                        <span className={styles.logDetails}>{w.details}</span>
                    ) : null}
                </dd>
            ))}
        </>
    );
};


interface GeometriesPreviewProps {
    evalStatus: 0 | 1 | 2; // 0 - neutral; 1 - success; 2 - eval error
    mapOptions?: MapOptions;
    ref: React.RefObject<Renderer | null>;
    className?: string;
}

const GeometriesPreview: React.FunctionComponent<GeometriesPreviewProps> = ({ evalStatus, mapOptions, ref, className }) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [ popup, setPopup ] = React.useState<Feature | null>(null);
    const [ vVisible, setVVisible ] = React.useState<boolean>(Boolean(mapOptions?.v));
    const [ dVisible, setDVisible ] = React.useState<boolean>(Boolean(mapOptions?.d));
    const [ gVisible, setGVisible ] = React.useState<boolean>(true);
    const [ cursor, setCursor ] = React.useState<string>('');
    const { colorMode } = useColorMode();


    React.useEffect(() => {
        if (rootRef.current) {
            const renderer = new Renderer(rootRef.current);
            renderer.setPopup = setPopup;
            renderer.showVertices = vVisible;
            renderer.showDirections = dVisible;
            ref.current = renderer;
            return () => {
                renderer.cleanup();
                ref.current = null;
            };
        }
    }, []);

    React.useEffect(() => {
        const renderer = ref.current;
        if (renderer) {
            renderer.setStyles(palettes[ colorMode ]);
        }
    }, [ colorMode ]);

    const handleKeyDownOnRoot: React.KeyboardEventHandler<HTMLDivElement> = React.useCallback((e) => {
        const renderer = ref.current;
        if (!renderer) return;
        switch (e.key) {
            case 'Escape': {
                renderer.closePopup();
                break;
            }
            case '0':
            case 'r': {
                renderer.resetView();
                break;
            }
            case 'f': {
                renderer.toggleFullscreen();
                break;
            }
        }
    }, []);

    const handleKeyDownOnSettings: React.KeyboardEventHandler<HTMLDetailsElement> = React.useCallback((e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
            const match = (e.target as HTMLElement).closest('details');
            if (match?.open) {
                match.removeAttribute('open');
            }
        }
    }, []);

    const toggleShowVertices: React.ChangeEventHandler<HTMLInputElement> = React.useCallback((e) => {
        const newState = e.target.checked;
        setVVisible(newState);
        const renderer = ref.current;
        if (renderer) {
            renderer.setShowVertices(newState);
        }
    }, []);

    const toggleShowDirection: React.ChangeEventHandler<HTMLInputElement> = React.useCallback((e) => {
        const newState = e.target.checked;
        setDVisible(newState);
        const renderer = ref.current;
        if (renderer) {
            renderer.setShowDirections(newState);
        }
    }, []);

    const toggleShowGrid: React.ChangeEventHandler<HTMLInputElement> = React.useCallback((e) => {
        const newState = e.target.checked;
        setGVisible(newState);
        const renderer = ref.current;
        if (renderer) {
            renderer.setShowGrid(newState);
        }
    }, []);

    const handleResize: React.PointerEventHandler = React.useCallback((e) => {
        const root = rootRef.current;
        if (!root) return;

        const rect = root.getBoundingClientRect();
        const clickPoint = { y: e.clientY };

        const handlePointerMove = (e: PointerEvent) => {
            const dy = e.clientY - clickPoint.y;
            const newHeightInPx = rect.height + dy;
            root.style.height = `${newHeightInPx}px`;
        };

        // set cursor
        document.body.style.cursor = 'ns-resize';
        root.style.userSelect = 'none';
        root.style.pointerEvents = 'none';

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', () => {
            document.removeEventListener('pointermove', handlePointerMove);

            // reset cursor
            document.body.style.removeProperty('cursor');
            root.style.removeProperty('user-select');
            root.style.removeProperty('pointer-events');
        }, { once: true });
    }, []);

    return (
        <div
            ref={rootRef}
            className={clsx('plane', styles.previewSection, styles.geometryViewer, className)}
            tabIndex={0}
            onKeyDown={handleKeyDownOnRoot}
        >
            <div className={styles.viewer}>
                <canvas className={clsx(styles.canvas, cursor)}>
                    Preview of geometries from the script
                </canvas>
                <svg className={styles.svg}>
                    <g className='grid'></g>
                    <g className='x'></g>
                    <g className='y'></g>
                </svg>
            </div>

            <div className={styles.featurePopupBoundary}>
                <div className={clsx(styles.featurePopup, styles.hidden)}>
                    {popup && (
                        <FeaturePopup d={popup} v={ref} />
                    )}
                </div>
            </div>

            <details
                className={clsx(styles.previewSectionBar, styles.options)}
                onKeyDown={handleKeyDownOnSettings}
            >
                <summary className={styles.optionsBar}>
                    <svg viewBox='0 0 48 48' width='1em' height='1em'>
                        <path
                            className={styles.expandCollapseIcon}
                            d='M4 16 L24 36 M24 36 L44 16'
                        />
                        <circle
                            className={clsx(styles.evalStatusIcon, {
                                [ styles.evalSuccess ]: evalStatus === 1,
                                [ styles.evalError ]: evalStatus === 2,
                            })}
                            cx='24' cy='24' r='18'
                        />
                    </svg>
                    <span data-type='zoom' title='zoom'></span>
                    <div className={styles.pointerPosIndicator}>
                        <span data-type='x' title='x'></span>
                        <span data-type='y' title='y'></span>
                    </div>
                </summary>
                <div className={styles.optionsBody}>
                    {evalStatus === 2 ? (
                        <>
                            <div className={styles.evalErrorDescription}>
                                <svg viewBox='0 0 48 48' width='1em' height='1em'>
                                    <circle cx='24' cy='24' r='18' />
                                </svg>
                                <span>
                                    code evaluation error<br />
                                    preview is not up to date
                                </span>
                            </div>
                            <hr className={styles.horizontalSeparator} />
                        </>
                    ) : null}

                    <label className={styles.checkboxLabel}>
                        <input
                            type='checkbox'
                            checked={vVisible}
                            onChange={toggleShowVertices}
                        />
                        <span>show vertices</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input
                            type='checkbox'
                            checked={dVisible}
                            onChange={toggleShowDirection}
                        />
                        <span>show directions</span>
                    </label>

                    <hr className={styles.horizontalSeparator} />

                    <label className={styles.checkboxLabel}>
                        <input
                            type='checkbox'
                            checked={gVisible}
                            onChange={toggleShowGrid}
                        />
                        <span>show grid</span>
                    </label>

                    <hr className={styles.horizontalSeparator} />

                    <label className={styles.selectLabel}>
                        <span>Funky cursor</span>
                        <select onChange={e => setCursor(e.target.value)}>
                            <option value=''>Default</option>
                            <option value={styles.cursor_dot_white}>White dot</option>
                            <option value={styles.cursor_dot_black}>Black dot</option>
                            <option value={styles.cursor_donut_white}>White donut</option>
                            <option value={styles.cursor_donut_black}>Black donut</option>
                        </select>
                    </label>

                    <hr className={styles.horizontalSeparator} />

                    <PreviewButton
                        onClick={() => ref.current?.resetView()}
                        withClickFeedback
                    >
                        reset view
                    </PreviewButton>
                    <PreviewButton
                        onClick={() => ref.current?.toggleFullscreen()}
                    >
                        toggle fullscreen
                    </PreviewButton>
                    <PreviewButton
                        className={styles.screenshotButton}
                        onClick={async (e) => {
                            const dpr = Number((e.target as HTMLElement).dataset.dpr || '');
                            console.log('capturing screenshot with DPR', dpr);
                            await ref.current?.saveScreenshot(isFinite(dpr) ? dpr : undefined);
                        }}
                        data-dpr={4}
                        withClickFeedback
                    >
                        capture screenshot
                    </PreviewButton>
                </div>
            </details>

            <div className={styles.featureList}>
            </div>

            <Resizer
                className={styles.geometryViewerResizer}
                onPointerDown={handleResize}
            />
        </div>
    );
};


interface FeaturePopupProps {
    d: Feature;
    v: React.RefObject<Renderer | null>;
}

const FeaturePopup: React.FunctionComponent<FeaturePopupProps> = ({ d, v }) => {
    React.useEffect(() => {
        v.current!.panPopupIntoView();
    }, [ d, v ]);
    return (
        <>
            <header className={styles.featurePopupHeader}>
                <code>{d.name}</code><i>{d.geom.type}</i>
            </header>

            {d.geom.id != null ? (
                <div className={styles.featurePopupId}>
                    <ValuePreview name='ID' value={d.geom.id} />
                </div>
            ) : null}

            {d.geom.props ? (
                <ValuesPreview
                    values={Object.entries(d.geom.props).map(([ k, v ]) => ({ name: k, value: v }))}
                    label='Properties'
                    className={clsx(styles.miniPreviewSection, styles.featurePopupProperties)}
                />
            ) : null}

            <PreviewButton
                onClick={() => {
                    copy(JSON.stringify(d.geom.toJSON()));
                }}
                withClickFeedback
            >
                copy as GeoJSON
            </PreviewButton>

            <PreviewButton
                onClick={() => {
                    copy(window.geos.toWKT(d.geom));
                }}
                withClickFeedback
            >
                copy as WKT
            </PreviewButton>
        </>
    );
};


interface PreviewButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    withClickFeedback?: boolean;
}

const PreviewButton = ({ onClick, className, withClickFeedback, ...props }: PreviewButtonProps) => {
    const [ active, setActive ] = React.useState(false);

    React.useEffect(() => {
        if (active) {
            const timeoutId = setTimeout(() => {
                setActive(false);
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [ active ]);

    return (
        <button
            className={clsx(styles.previewButton, className)}
            data-feedback={withClickFeedback && active ? 'success' : null}
            onClick={async (e) => {
                await onClick!(e);
                setActive(true);
            }}
            {...props}
        />
    );
};
