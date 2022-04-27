const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');
const process = require('process');

module.exports = {
    entry: './src/index.js',
    output: {
	filename: 'erc20permit-signer.bundle.js',
	path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
	fallback: {
	    "stream": false,
	    "os":     false,
	    "util":   false,
	    "buffer": require.resolve("buffer"),
	    "crypto": require.resolve("crypto-browserify"),
	    "assert": require.resolve("assert/"),
	    "http":   require.resolve("stream-http"),
	    "https":  require.resolve("https-browserify"),
	}
    },
    plugins: [

	// fix "process is not defined" error:
	//new webpack.DefinePlugin({
	//    'process.nextTick': setImmediate,
	//    'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
	//}),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: [require.resolve("buffer/"), "Buffer"],
        }),
	new CleanWebpackPlugin(),
	new HtmlWebpackPlugin({
            title: "UI Entrypoint",
            template: './src/index.template.html',
	}),
    ],
    module: {
	rules: [
	    {
		test: /\.(js|jsx)$/,
		exclude: /node_modules/,
		use: [
		    {
			loader: "babel-loader"
		    }
		],
	    },
	    {
		test: /\.css$/,
		use: [
		    {
			loader: "style-loader",
		    },
		    {
			loader: "css-loader",
		    },
		],
	    },
	],
    },
};
