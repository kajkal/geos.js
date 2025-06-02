import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';


function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div className='container'>
                <Heading as='h1' className='hero__title'>
                    {siteConfig.title}
                </Heading>
                <p className='hero__subtitle'>
                    {siteConfig.tagline}
                </p>
                <div className={styles.buttons}>
                    <Link
                        className='button button--secondary button--lg'
                        to='/docs/quick-start'>
                        Quick Start
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default function Home(): React.ReactNode {
    return (
        <Layout
            description='an easy-to-use JavaScript wrapper over WebAssembly build of GEOS'
        >
            <HomepageHeader />
            <main>
                <HomepageFeatures />
            </main>
        </Layout>
    );
}
