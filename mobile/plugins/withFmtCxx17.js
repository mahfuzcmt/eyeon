/**
 * Lets the iOS app compile with Xcode 26.4 and newer. React Native 0.81 ships the `fmt` library
 * 11.0.2, whose compile-time format checks (C++20 `consteval`) the newer Apple compiler refuses:
 * "call to consteval function 'fmt::basic_format_string<...>' is not a constant expression".
 * Building that one pod as C++17 switches those checks off; nothing else is affected.
 * Remove this when React Native brings a fixed fmt.
 */
const { withPodfile } = require("@expo/config-plugins");

const MARK = "# eyeon: fmt as C++17";
const PATCH = `
    ${MARK} (see plugins/withFmtCxx17.js)
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
`;

module.exports = function withFmtCxx17(config) {
  return withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents;
    if (!podfile.includes(MARK)) {
      // After react_native_post_install, which sets the C++ standard of every pod.
      const at = podfile.indexOf("post_install do |installer|");
      const end = at < 0 ? -1 : podfile.indexOf("\n  end", at);
      if (end < 0) throw new Error("withFmtCxx17: post_install block not found in the Podfile");
      podfile = podfile.slice(0, end + 1) + PATCH.replace(/^\n/, "") + podfile.slice(end + 1);
      cfg.modResults.contents = podfile;
    }
    return cfg;
  });
};
