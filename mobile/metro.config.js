const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Ignore root node_modules if it doesn't exist
config.resolver.blockList = [
  // Ignore root node_modules
  /^(?!.*node_modules).*\/node_modules\/.*/,
  // Ignore other project node_modules
  /\/backend\/node_modules\/.*/,
  /\/frontend\/node_modules\/.*/,
];

module.exports = config;
