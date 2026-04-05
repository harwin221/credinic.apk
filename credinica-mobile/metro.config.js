const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resetear el caché de Metro al iniciar
config.resetCache = true;

// Excluir node_modules problemáticos del watch
config.watchFolders = [__dirname];

// Resolver extensiones en orden
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;
