import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';


const config: Config = {
    title: 'GEOS.js',
    tagline: 'an easy-to-use JavaScript wrapper over WebAssembly build of GEOS',
    favicon: 'img/favicon.ico',

    url: 'https://kajkal.github.io',
    baseUrl: '/geos.js/',

    organizationName: 'kajkal',
    projectName: 'geos.js',
    deploymentBranch: 'gh-pages',
    trailingSlash: false,

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    i18n: {
        defaultLocale: 'en',
        locales: [ 'en' ],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        colorMode: {
            respectPrefersColorScheme: true,
        },
        docs: {
            sidebar: {
                hideable: true,
            },
        },
        navbar: {
            title: 'GEOS.js',
            logo: {
                alt: 'GEOS.js Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    type: 'docSidebar',
                    sidebarId: 'docsSidebar',
                    position: 'left',
                    label: 'Docs',
                },
                {
                    type: 'docSidebar',
                    sidebarId: 'apiSidebar',
                    position: 'left',
                    label: 'API',
                },
                {
                    href: 'https://github.com/kajkal/geos.js',
                    position: 'right',
                    className: 'header-github-link',
                    title: 'GitHub repository',
                    'aria-label': 'GitHub repository',
                },
            ],
            hideOnScroll: true,
        },
        footer: {
            style: 'dark',
            copyright: `Copyright © ${new Date().getFullYear()} GEOS.js</br>Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.duotoneLight,
            darkTheme: prismThemes.gruvboxMaterialDark,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
