const { merge } = require("webpack-merge");
const webpack = require("webpack");
const base = require("./webpack.base");
module.exports = merge(base, {
  mode: "production",
  devtool: "source-map",
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
  ],
});
