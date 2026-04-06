const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to allow insecure HTTP protocols in Maven repositories.
 * Necessary for older native libraries that still reference JCenter or other HTTP repos.
 */
const withInsecureMaven = (config) => {
  return withProjectBuildGradle(config, (config) => {
    // Inject logic to allow insecure protocols in all project repositories
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
    return config;
  });
};

module.exports = withInsecureMaven;
