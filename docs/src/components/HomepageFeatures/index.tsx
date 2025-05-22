import type React from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './styles.module.css';


type FeatureItem = {
    title: string;
    Svg: React.ComponentType<React.ComponentProps<'svg'>>;
    description: ReactNode;
};

const FeatureList: FeatureItem[] = [
    {
        title: 'Easy to Use',
        Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
        description: (
            <>
                Simple API. Memory management, pointers and other C/C++/Wasm related
                stuff are handled by JavaScript wrapper.
            </>
        ),
    },
    {
        title: 'Organized',
        Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
        description: (
            <>
                Typed with TypeScript. Thoroughly tested and well documented.
            </>
        ),
    },
    {
        title: 'Old but reliable',
        Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
        description: (
            <>
                <Link to={'https://libgeos.org'}>GEOS</Link> is a well-established and proven GIS library.
                From many years it has been used by <Link to={'https://postgis.net'}>PostGIS</Link>, <Link to={'https://qgis.org'}>
                QGIS</Link>, <Link to={'https://gdal.org'}>GDAL</Link> and <Link to={'https://shapely.readthedocs.io'}>Shapely</Link>.
            </>
        ),
    },
];

function Feature({ title, Svg, description }: FeatureItem) {
    return (
        <div className={clsx('col col--4')}>
            <div className='text--center'>
                <Svg className={styles.featureSvg} role='img' />
            </div>
            <div className='text--center padding-horiz--md'>
                <Heading as='h3'>{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className='container'>
                <div className='row'>
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
