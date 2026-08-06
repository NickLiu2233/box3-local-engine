const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};
