import React from 'react';
import clsx from 'clsx';
import copy from 'copy-text-to-clipboard';
import SimpleEditor from 'react-simple-code-editor';
import Button from '@theme/CodeBlock/Buttons/Button';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { translate } from '@docusaurus/Translate';
import IconWordWrap from '@theme/Icon/WordWrap';
import IconSuccess from '@theme/Icon/Success';
import IconCopy from '@theme/Icon/Copy';
import { LanguageJavaScript } from '@site/src/utils/LanguageJavaScript';
import { Language } from '@site/src/utils/Language';

import styles from './styles.module.css';


const Preview = React.lazy(() => import('@site/src/components/Preview'));


interface InteractiveCodeBlockProps {
    js: LanguageJavaScript;
    code: string;
    title?: string;
}

export function InteractiveCodeBlock({ js, code, title }: InteractiveCodeBlockProps) {
    const { scrollableElRef, onWrapToggle } = useOverflowDetector();
    const [ value, setValue ] = React.useState(code);
    return (
        <div className={styles.interactiveCodeBlock}>
            {title ? (
                <div className={styles.codeBlockTitle}>
                    {title}
                </div>
            ) : null}
            <div className={styles.interactiveCodeBlockBody}>
                <div className={styles.codeBlockScrollContainer} ref={scrollableElRef}>
                    <SimpleEditor
                        value={value}
                        onValueChange={setValue}
                        highlight={js.highlight}
                        preClassName={styles.codeBlock}
                        tabSize={4}
                        padding='var(--ifm-pre-padding)'
                        placeholder='// type some code'
                    />
                </div>
                <CodeBlockActions code={value} onWrapToggle={onWrapToggle} />
            </div>
            <div className={styles.interactiveCodeBlockPreviewContainer}>
                <BrowserOnly>
                    {() => (
                        <React.Suspense>
                            <Preview
                                js={js}
                                code={value}
                                className={styles.interactiveCodeBlockPreview}
                            />
                        </React.Suspense>
                    )}
                </BrowserOnly>
            </div>
        </div>
    );
}


interface StaticCodeBlock {
    lang: Language;
    code: string;
    title?: string;
}

export function StaticCodeBlock({ lang, code, title }: StaticCodeBlock) {
    const { scrollableElRef, onWrapToggle } = useOverflowDetector();
    return (
        <div className={styles.staticCodeBlock}>
            {title ? (
                <div className={styles.codeBlockTitle}>
                    {title}
                </div>
            ) : null}
            <div className={styles.staticCodeBlockBody}>
                <div className={styles.codeBlockScrollContainer} ref={scrollableElRef}>
                    <pre className={styles.codeBlock} children={lang.highlight(code)} />
                </div>
                <CodeBlockActions code={code} onWrapToggle={onWrapToggle} />
            </div>
        </div>
    );
}


function useOverflowDetector() {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const ro = new ResizeObserver(([ entry ]) => {
            const el = entry.target;
            if (el.scrollWidth > el.clientWidth) {
                el.parentElement.classList.add(styles.codeBlockOverflow);
            } else {
                el.parentElement.classList.remove(styles.codeBlockOverflow);
            }
        });
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, []);

    const handleWordWrapToggle = React.useCallback(() => {
        ref.current.parentElement.classList.toggle(styles.codeBlockWrap);
    }, []);

    return { scrollableElRef: ref, onWrapToggle: handleWordWrapToggle };
}


const CodeBlockActions: React.FunctionComponent<{ code: string, onWrapToggle: () => void }> = ({ code, onWrapToggle }) => {
    const [ isCopied, setIsCopied ] = React.useState(false);

    const copyCode = React.useCallback(() => {
        setIsCopied(true);
    }, [ code ]);

    React.useEffect(() => {
        if (isCopied) {
            copy(code);
            let timeoutId = window.setTimeout(() => {
                setIsCopied(false);
            }, 1000);
            return () => window.clearTimeout(timeoutId);
        }
    }, [ isCopied ]);

    const wrapBtnTitle = translate({
        id: 'theme.CodeBlock.wordWrapToggle',
        message: 'Toggle word wrap',
    });

    const copyBtnAriaLabel = isCopied
        ? translate({
            id: 'theme.CodeBlock.copied',
            message: 'Copied',
        })
        : translate({
            id: 'theme.CodeBlock.copyButtonAriaLabel',
            message: 'Copy code to clipboard',
        });

    const copyBtnTitle = translate({
        id: 'theme.CodeBlock.copy',
        message: 'Copy',
    });

    return (
        <div className={styles.codeBlockActions}>
            <Button
                onClick={onWrapToggle}
                className={styles.wordWrapButton}
                aria-label={wrapBtnTitle}
                title={wrapBtnTitle}
            >
                <IconWordWrap className={styles.wordWrapButtonIcon} aria-hidden='true' />
            </Button>
            <Button
                aria-label={copyBtnAriaLabel}
                title={copyBtnTitle}
                onClick={copyCode}
                className={clsx(
                    styles.copyButton,
                    isCopied && styles.copyButtonCopied,
                )}
            >
                <span className={styles.copyButtonIcons} aria-hidden='true'>
                    <IconCopy className={styles.copyButtonIcon} />
                    <IconSuccess className={styles.copyButtonSuccessIcon} />
                </span>
            </Button>
        </div>
    );
};
