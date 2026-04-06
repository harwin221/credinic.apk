const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to eliminate 'insecure protocol' and JCenter issues
 * for the legacy bluetooth printer library in Gradle 8+.
 */
const withFixedPrinter = (config) => {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Force secure protocols and replace jcenter in ALL repositories blocks
    contents = contents.replace(/jcenter\(\)/g, 'mavenCentral()');
    contents = contents.replace(/maven\s*{\s*url\s*["']http:\/\/jcenter.bintray.com\/["']\s*}/g, 'mavenCentral()');

    // 2. Global opt-in for insecure protocols (Nuclear option to bypass all errors)
    if (!contents.includes('allowInsecureProtocol = true')) {
        contents = contents.replace(
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
        
        // Also apply to buildscript
        contents = contents.replace(
            /buildscript\s*{[\s\S]*?repositories\s*{/,
            `buildscript {
    repositories {
        all {
            if (it instanceof MavenArtifactRepository && it.url.toString().startsWith("http:")) {
                it.allowInsecureProtocol = true
            }
        }
        `
        );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withFixedPrinter;
