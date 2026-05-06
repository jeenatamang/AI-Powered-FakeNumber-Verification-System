const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix FormData doesn't exist error
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'form-data': path.resolve(__dirname, 'shims/formdata-shim.js'),
};

module.exports = config;