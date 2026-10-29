const { withEntitlementsPlist } = require('expo/config-plugins');

// Expo's run:ios demands code signing for simulator builds once this entitlement is present.
// Enable ios.usesAppleSignIn once the Apple Developer account exists.
// Must be listed before expo-apple-authentication in app.json (mods run in reverse order).
module.exports = function withAppleSignInSwitch(config) {
  return withEntitlementsPlist(config, (mod) => {
    if (config.ios?.usesAppleSignIn !== true) {
      delete mod.modResults['com.apple.developer.applesignin'];
    }
    return mod;
  });
};
