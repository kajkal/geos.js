import React from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { editor } from 'monaco-editor';
import { useColorMode } from '@docusaurus/theme-common';

import geojsonTypes from '/types/geojson.d.ts?raw';
import geosTypes from '/types/geos.js.d.ts?raw';

import './styles.css';


monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    noResolve: true,
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
});

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
});

monaco.languages.typescript.javascriptDefaults.setExtraLibs([
    { content: geojsonTypes, filePath: 'file:///node_modules/@types/geojson/index.d.ts' },
    { content: geosTypes, filePath: 'file:///node_modules/@types/geos.js/index.d.ts' },
]);

monaco.editor.defineTheme('light', {
    base: 'vs',
    inherit: true,
    rules: [
        { token: 'comment', foreground: 'bdbbb3' },
        { token: 'keyword', foreground: 'db5877' },
        { token: 'delimiter', foreground: 'c57485' },
        { token: 'number', foreground: '2992cf' },
        { token: 'string', foreground: '7faf59' },
        { token: 'regexp', foreground: '77bcbb' },
    ],
    colors: {
        'editor.background': '#fcfbf7',
        'editor.foreground': '#807a78',
    },
});

monaco.editor.defineTheme('dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'comment', foreground: '807973' },
        { token: 'keyword', foreground: 'd8655e' },
        { token: 'delimiter', foreground: 'b3544f' },
        { token: 'number', foreground: '5ed6e6' },
        { token: 'string', foreground: '88b872' },
        { token: 'regexp', foreground: 'b8d877' },
    ],
    colors: {
        'editor.background': '#292828',
        'editor.foreground': '#eadbba',
    },
});


const uri = monaco.Uri.parse('inmemory://model/playground.js');
let viewState: editor.ICodeEditorViewState | undefined;


interface EditorProps {
    initialCode: string;
    onChange: (value: string) => void;
}

export default function SmartEditor({ initialCode, onChange }: EditorProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const { colorMode } = useColorMode();

    React.useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        let model = monaco.editor.getModel(uri);
        if (!model) {
            model = monaco.editor.createModel(initialCode, 'javascript', uri);
        }

        const editor = monaco.editor.create(containerRef.current, {
            model,
            theme: colorMode,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            minimap: {
                enabled: false,
            },
            scrollbar: {
                horizontalScrollbarSize: 8,
                verticalScrollbarSize: 8,
            },
            fontFamily: 'var(--ifm-font-family-monospace)',
            fontSize: 14,
            lineHeight: 19,
        });

        editor.addAction({
            id: 'toggleWordWrap',
            label: 'Toggle Word Wrap',
            keybindings: [ monaco.KeyMod.Alt | monaco.KeyCode.KeyZ ],
            run: (editor) => {
                const options = editor.getRawOptions();
                editor.updateOptions({ wordWrap: options.wordWrap === 'on' ? 'off' : 'on' });
            },
            contextMenuGroupId: 'view',
            contextMenuOrder: 1,
        });

        if (viewState) {
            editor.restoreViewState(viewState);
        } else {
            const lineCount = model.getLineCount();
            const lastLineContent = model.getLineContent(lineCount);
            const lastColumn = lastLineContent.length + 1;
            editor.setPosition({
                lineNumber: lineCount,
                column: lastColumn,
            });
            editor.revealPositionInCenter({
                lineNumber: lineCount,
                column: lastColumn,
            });
        }

        editor.focus();
        editor.onDidChangeModelContent(() => {
            onChange(editor.getValue());
        });
        onChange(editor.getValue());

        return () => {
            viewState = editor.saveViewState();
            editor.dispose();
        };
    }, []);

    React.useEffect(() => {
        monaco.editor.setTheme(colorMode);
    }, [ colorMode ]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
            }}
        />
    );
}
