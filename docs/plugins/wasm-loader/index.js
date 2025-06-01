export default function wasmLoader(context, options) {
    return {
        name: 'wasm-loader',
        configureWebpack(config, isServer, utils, content) {
            return {
                module: {
                    rules: [
                        {
                            test: /\.wasm$/,
                            type: 'asset/resource',
                        },
                    ],
                },
            };
        },
    };
}
