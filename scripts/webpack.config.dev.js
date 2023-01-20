const path = require('path');
const { fileURLToPath } = require('url');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

const clientConfig = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    client: './src/client/index.tsx',
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

const serverConfig = {
  mode: 'development',
  entry: {
    server: './src/server/index.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externalsPresets: { node: true }, // in order to ignore built-in modules like path, fs, etc.
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/client/index.html' },
        { from: 'src/client/reset.css', to: 'static' },
        { from: 'src/client/styles.css', to: 'static' },
      ],
    }),
  ],
  target: 'node',
};

module.exports = [clientConfig, serverConfig];
