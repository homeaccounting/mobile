const {
  AndroidConfig,
  withInfoPlist,
  withStringsXml,
  createRunOncePlugin,
} = require('expo/config-plugins');

function withGoogleIdToken(config, props = {}) {
  const { iosClientId, webClientId } = props;
  if (!iosClientId || !webClientId)
    throw new Error('google-id-token plugin: iosClientId and webClientId are required');
  const reversed = iosClientId.split('.').reverse().join('.');

  config = withInfoPlist(config, (c) => {
    c.modResults.GIDClientID = iosClientId;
    const types = c.modResults.CFBundleURLTypes ?? [];
    if (!types.some((t) => t.CFBundleURLSchemes?.includes(reversed)))
      types.push({ CFBundleURLSchemes: [reversed] });
    c.modResults.CFBundleURLTypes = types;
    return c;
  });

  return withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'google_id_token_web_client_id', translatable: 'false' }, _: webClientId }],
      c.modResults,
    );
    return c;
  });
}

module.exports = createRunOncePlugin(withGoogleIdToken, 'google-id-token', '0.1.0');
