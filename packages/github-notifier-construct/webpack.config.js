//webpack.config.js
const path = require("path");

module.exports = {
    target: 'node',
    mode: "development",
    devtool: "inline-cheap-module-source-map",
    entry: {
        'lambda': "./lib/lambda.ts",
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['*', '.js', '.jsx', '.tsx', '.ts', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                loader: "ts-loader"
            }
        ]
    },
    externalsPresets: {node: true}, // in order to ignore built-in modules like path, fs, etc.
    // externals: [
    //     'aws-sdk',
    //     nodeExternals({
    //         allowlist: ['axios', 'follow-redirects'],
    //     }),
    // ], // in order to ignore all modules in node_modules folder
};
