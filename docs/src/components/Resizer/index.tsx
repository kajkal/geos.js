import React from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';


export function Resizer({ className, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
    return (
        <div
            className={clsx(styles.resizer, className)}
            {...props}
        />
    );
}
