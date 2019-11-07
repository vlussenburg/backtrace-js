const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const config = {
  mode: 'development',
  entry: {
    app: path.resolve(__dirname, 'source/index.ts'),
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  devtool: 'source-map',
  node: {
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@src': path.resolve('source'),
    },
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      tslint: true,
      workers: 2,
      useTypescriptIncrementalApi: false,
    }),
  ],
};

if (process.env.NODE_ENV === 'production') {
  config.mode = 'production';
  delete config.devtool;
}

module.exports = config;
