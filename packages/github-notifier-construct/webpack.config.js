//webpack.config.js
const nodeExternals = require('webpack-node-externals');
const path = require("path");

module.exports = {
    target: 'node',
    mode: "development",
    devtool: "inline-source-map",
    context: path.resolve(__dirname, 'lib'),
    entry: {
        'lambda': "./lambda.ts",
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/lib',
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            }
        ]
    },
    externalsPresets: {node: true}, // in order to ignore built-in modules like path, fs, etc.
    externals: [nodeExternals({
        allowlist: ['axios'],
    })], // in order to ignore all modules in node_modules folder
};
