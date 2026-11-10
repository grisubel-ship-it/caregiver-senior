/**
 * Capacitor config for Caregiver Senior Android build.
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const config = {
  appId: 'com.caregiversync.app',
  appName: 'Caregiver Senior',
  webDir: 'build',
  android: {
    allowMixedContent: false,
    backgroundColor: '#F8F7F2',
    includePlugins: [
      '@capacitor/app',
      '@capacitor/device',
      '@capacitor/filesystem',
      '@capacitor/local-notifications',
      '@capacitor/share',
      '@revenuecat/purchases-capacitor',
    ],
  },
};

module.exports = config;
