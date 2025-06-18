import assert from 'node:assert/strict';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';


export default function wasmLoader(context, options) {
    return {
        name: 'monaco-editor-loader',
        configureWebpack(config, isServer, utils, content) {

            // exclude other rules from modifying .d.ts?raw file
            // to allow importing .d.ts file content as 'asset/source' string
            config.module?.rules.forEach(rule => {
                if (rule.test instanceof RegExp && rule.test.test('some-file.d.ts')) {
                    assert.ok(!rule.resourceQuery);
                    rule.resourceQuery = { not: [ /raw/ ] };
                }
            });

            return {
                module: {
                    rules: [
                        {
                            resourceQuery: /raw/,
                            type: 'asset/source',
                        },
                    ],
                },
                plugins: [
                    new MonacoWebpackPlugin({
                        languages: [
                            'javascript',
                            'typescript',
                        ],
                    }),
                ],
            };
        },
    };
}
