import React from 'react';
import type { Props } from '@theme/CodeBlock';
import { InteractiveCodeBlock, StaticCodeBlock } from '@site/src/components/CodeBlock';
import { LanguageJavaScript } from '@site/src/utils/LanguageJavaScript';
import { Language } from '@site/src/utils/Language';


export default function CodeBlock({ children, className, metastring }: Props): React.ReactNode {
    if (typeof children !== 'string') {
        throw new Error('invalid children prop');
    }

    let title: string;
    metastring = metastring?.replace(/title=(["'])(.*?)\1/, (_0, _1, match) => {
        title = match;
        return '';
    });

    const live = metastring?.includes('live');
    if (live) {
        return (
            <InteractiveCodeBlock
                js={new LanguageJavaScript()}
                code={children.trim()}
                title={title}
            />
        );
    }

    let lang: Language;
    if (className === 'language-js') {
        lang = new LanguageJavaScript(true);
    } else {
        lang = new Language();
    }

    return (
        <StaticCodeBlock
            lang={lang}
            code={children.trim()}
            title={title}
        />
    );
}
