const { merge } = require('webpack-merge');
const [clientConfigDev, apiConfigDev] = require('./webpack.config.dev');

const clientConfig = merge(clientConfigDev, {
  mode: 'production',
  devtool: false,
});

const apiConfig = merge(apiConfigDev, {
  mode: 'production',
});

module.exports = [clientConfig, apiConfig];
