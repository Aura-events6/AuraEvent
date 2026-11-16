const { createRunOncePlugin, withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

function setForceDarkModeToFalse(styles) {
  return AndroidConfig.Styles.assignStylesValue(styles, {
    add: true,
    parent: { name: 'AppTheme' },
    name: 'android:forceDarkAllowed',
    value: 'false',
    targetApi: 'q',
  });
}

const withDisableForcedDarkMode = (config) => {
  return withAndroidStyles(config, (config) => {
    config.modResults = setForceDarkModeToFalse(config.modResults);
    return config;
  });
};

module.exports = createRunOncePlugin(
  withDisableForcedDarkMode,
  'disable-forced-dark-mode',
  '1.0.0'
);
