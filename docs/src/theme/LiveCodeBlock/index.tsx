import React, { type ReactNode } from 'react';
import type { Props } from '@theme/LiveCodeBlock';
import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeBlock from '@theme/CodeBlock';


export default function SuspendedLiveCodeBlock(props: Props): ReactNode {
    const fallback = (
        <CodeBlock
            {...props}
            live={false}
            metastring={props.metastring.replace(/ ?live ?/, ' ').trim()}
        />
    );
    return (
        <BrowserOnly fallback={fallback}>
            {() => {
                const { LiveCodeBlock } = require('@site/src/components/LiveCodeBlock');
                return (
                    <React.Suspense fallback={fallback}>
                        <LiveCodeBlock {...props} />
                    </React.Suspense>
                );
            }}
        </BrowserOnly>
    );
}
