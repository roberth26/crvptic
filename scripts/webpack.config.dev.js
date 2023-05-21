const path = require('path');
const { fileURLToPath } = require('url');
const { DefinePlugin } = require('webpack');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

const clientConfig = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    client: './src/client/client.tsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build/static'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [
              '@babel/preset-env',
              '@babel/react',
              '@babel/preset-typescript',
            ],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env.PORT': JSON.stringify(process.env['PORT']),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: './src/static',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

const apiConfig = {
  mode: 'development',
  entry: {
    api: './src/server/api.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build/server'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [['@babel/preset-env'], '@babel/preset-typescript'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  externalsPresets: { node: true }, // in order to ignore built-in modules like path, fs, etc.
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  target: 'node',
};

module.exports = [clientConfig, apiConfig];
