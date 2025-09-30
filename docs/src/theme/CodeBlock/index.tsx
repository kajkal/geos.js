import React from 'react';
import type { Props } from '@theme/CodeBlock';
import { InteractiveCodeBlock, StaticCodeBlock } from '@site/src/components/CodeBlock';
import { LanguageJavaScript } from '@site/src/utils/LanguageJavaScript';
import { Language } from '@site/src/utils/Language';


export default function CodeBlock({ children, className, metastring }: Props): React.ReactNode {
    if (typeof children !== 'string') {
        throw new Error('invalid children prop');
    }

    let title: string | undefined = undefined;
    metastring = metastring?.replace(/title=(["'])(.*?)\1/, (_0, _1, match) => {
        title = match;
        return '';
    });

    const liveMatch = metastring?.match(/live(?:\[(v,?)?(d,?)?])?/);
    if (liveMatch) {
        const [ _, v, d ] = liveMatch;
        return (
            <InteractiveCodeBlock
                js={new LanguageJavaScript()}
                initialCode={children.trim()}
                title={title}
                mapOptions={{
                    v: Boolean(v),
                    d: Boolean(d),
                }}
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
