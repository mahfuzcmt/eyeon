/**
 * Signs release builds (APK and the Play Store .aab) with the EyeOn upload key instead of the
 * debug key that `expo prebuild` writes. The key and its passwords are never in the repo: they
 * are read from Gradle properties on the build machine (~/.gradle/gradle.properties):
 *   EYEON_UPLOAD_STORE_FILE, EYEON_UPLOAD_KEY_ALIAS, EYEON_UPLOAD_STORE_PASSWORD, EYEON_UPLOAD_KEY_PASSWORD
 * Without them the release build falls back to the debug key (fine for a test APK, refused by Play).
 */
const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('EYEON_UPLOAD_STORE_FILE')) {
                storeFile file(EYEON_UPLOAD_STORE_FILE)
                storePassword EYEON_UPLOAD_STORE_PASSWORD
                keyAlias EYEON_UPLOAD_KEY_ALIAS
                keyPassword EYEON_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("EYEON_UPLOAD_STORE_FILE")) {
      // add a release signing config next to the debug one
      g = g.replace(/signingConfigs\s*\{([\s\S]*?keyPassword 'android'\s*\n\s*\})/, (m) => m + RELEASE_CONFIG);
      // use it for the release build type (not the debug one) when the key is configured
      const types = g.indexOf("buildTypes");
      const release = types < 0 ? -1 : g.indexOf("release {", types);
      const line = release < 0 ? -1 : g.indexOf("signingConfig signingConfigs.debug", release);
      if (line < 0) throw new Error("withReleaseSigning: release build type not found in app/build.gradle");
      g =
        g.slice(0, line) +
        "signingConfig project.hasProperty('EYEON_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug" +
        g.slice(line + "signingConfig signingConfigs.debug".length);
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
