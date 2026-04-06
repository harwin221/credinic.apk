const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix the 'insecure protocol' and JCenter issues
 * for the react-native-bluetooth-escpos-printer library.
 */
const withFixedPrinter = (config) => {
  return withProjectBuildGradle(config, (config) => {
    // 1. Force allowInsecureProtocol for anything that might still use http
    if (!config.modResults.contents.includes('allowInsecureProtocol')) {
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*{[\s\S]*?repositories\s*{/,
          `allprojects {
    repositories {
        all {
            if (it instanceof MavenArtifactRepository && it.url.toString().startsWith("http:")) {
                it.allowInsecureProtocol = true
            }
        }
        `
        );
    }

    // 2. Replace JCenter with Central if it appears
    config.modResults.contents = config.modResults.contents.replace(/jcenter\(\)/g, 'mavenCentral()');
    
    return config;
  });
};

module.exports = withFixedPrinter;
