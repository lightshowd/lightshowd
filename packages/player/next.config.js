const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/player',
  transpilePackages: ['@lightshowd/core'],
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Prevent duplicate versions from peer dependencies
    config.resolveLoader.alias['react'] = path.resolve('./node_modules/react');

    return config;
  },
};

module.exports = nextConfig;
