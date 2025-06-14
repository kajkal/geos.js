import React from 'react';


export class Language {

    highlight(code: string): React.ReactNode {
        return React.createElement('code', {
            dangerouslySetInnerHTML: { __html: escapeHtml(code) },
        });
    }

}


export const escapeHtml = (text: string) => {
    return text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
};
