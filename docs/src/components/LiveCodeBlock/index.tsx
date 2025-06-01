import React from 'react';
import type { Props } from '@theme/LiveCodeBlock';
import Playground from '@theme/Playground';
import { preview } from '@site/src/components/LiveCodeBlock/Preview';


let ReactLiveScope: unknown;

export function LiveCodeBlock(props: Props): React.ReactNode {
    if (!window.geos) {
        throw window.geosPromise;
    }
    if (!ReactLiveScope) {
        ReactLiveScope = { ...window.geos, preview };
    }
    return <Playground scope={ReactLiveScope} {...props} />;
}
