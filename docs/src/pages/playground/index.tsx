import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { LanguageJavaScript } from '@site/src/utils/LanguageJavaScript';
import { Resizer } from '@site/src/components/Resizer';

import styles from './styles.module.css';


const Editor = React.lazy(() => import('@site/src/components/SmartEditor'));
const Preview = React.lazy(() => import('@site/src/components/Preview'));


const initialCode = `// Here you can play with GEOS.js
// It is already initialized and all functions are in the editor scope

const p1 = buffer(fromWKT('POINT (1 1)'), 10);
const p2 = buffer(point([ 6, 6 ]), 8, { quadrantSegments: 2 });
const u = union(p1, p2);
const a = area(u);
`;


export default function PlaygroundPage() {
    const [ value, setValue ] = React.useState('');
    const [ direction, setDirection ] = React.useState<'col' | 'row'>('row');
    const containerRef = React.useRef<HTMLElement>(null);
    const editorContainerRef = React.useRef<HTMLDivElement>(null);
    const previewContainerRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        const handleWindowResize = () => {
            setDirection(window.innerWidth > 996 ? 'row' : 'col');
        };
        handleWindowResize();
        window.addEventListener('resize', handleWindowResize);
        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, []);

    React.useEffect(() => {
        const editorContainerEl = editorContainerRef.current!;
        editorContainerEl.style.removeProperty('width');
        editorContainerEl.style.removeProperty('height');
    }, [ direction ]);

    const handleResize: React.PointerEventHandler = React.useCallback((e) => {
        const containerEl = containerRef.current!;
        const editorContainerEl = editorContainerRef.current!;
        const previewContainerEl = previewContainerRef.current!;

        const containerRect = containerEl.getBoundingClientRect();
        const rect = editorContainerEl.getBoundingClientRect();
        const clickPoint = { x: e.clientX, y: e.clientY };

        const handlePointerMove = direction === 'row'
            ? (e: PointerEvent) => {
                const dx = e.clientX - clickPoint.x;
                const newWidthInPct = (rect.width + dx) / containerRect.width * 100;
                editorContainerEl.style.width = `${newWidthInPct}%`;
            }
            : (e: PointerEvent) => {
                const dy = e.clientY - clickPoint.y;
                const newHeightInPx = rect.height + dy;
                editorContainerEl.style.height = `${newHeightInPx}px`;
            };

        // set cursor
        document.body.style.cursor = `${direction === 'row' ? 'ew' : 'ns'}-resize`;
        editorContainerEl.style.userSelect = 'none';
        editorContainerEl.style.pointerEvents = 'none';
        previewContainerEl.style.userSelect = 'none';
        previewContainerEl.style.pointerEvents = 'none';

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', () => {
            document.removeEventListener('pointermove', handlePointerMove);

            // reset cursor
            document.body.style.removeProperty('cursor');
            editorContainerEl.style.removeProperty('user-select');
            editorContainerEl.style.removeProperty('pointer-events');
            previewContainerEl.style.removeProperty('user-select');
            previewContainerEl.style.removeProperty('pointer-events');
        }, { once: true });
    }, [ direction ]);

    const js = React.useMemo(() => new LanguageJavaScript(), []);
    const editorFallback = React.useMemo(() => (
        <div className={styles.editorPlaceholder}>
            <pre>
                <code>
                    {initialCode
                        .split('\n')
                        .map((line, i) => (
                            <span key={i}>{line.startsWith('//') ? '' : line}{'\n'}</span>
                        ))}
                </code>
            </pre>
        </div>
    ), []);

    return (
        <Layout
            description={
                'Play with GEOS.js online with no setup! ' +
                'Import data from GeoJSON, WKT or WKB formats and visualize results on the map!'
            }
            noFooter
        >
            <main
                ref={containerRef}
                className={styles.playgroundPage}
                data-dir={direction}
            >
                <div
                    ref={editorContainerRef}
                    className={styles.editor}
                >
                    <BrowserOnly fallback={editorFallback}>
                        {() => (
                            <React.Suspense fallback={editorFallback}>
                                <Editor
                                    initialCode={initialCode}
                                    onChange={setValue}
                                />
                            </React.Suspense>
                        )}
                    </BrowserOnly>
                    <Resizer
                        className={styles.editorResizer}
                        onPointerDown={handleResize}
                    />
                </div>
                <div
                    ref={previewContainerRef}
                    className={styles.preview}
                >
                    <BrowserOnly>
                        {() => (
                            <React.Suspense>
                                <Preview
                                    js={js}
                                    code={value}
                                    mapAlwaysVisible
                                />
                            </React.Suspense>
                        )}
                    </BrowserOnly>
                </div>
            </main>
        </Layout>
    );
}
