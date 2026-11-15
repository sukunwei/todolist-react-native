module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // 本项目所有颜色都来自运行时主题（useTheme），无法用静态 StyleSheet 表达，
    // 因此内联 style 是有意为之，不作为告警。
    'react-native/no-inline-styles': 'off',
    // React Navigation 的 headerLeft / headerRight / options 本质上就是渲染回调，
    // 只能以 props 的形式传入，属于该规则的官方放行方式。
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  },
  overrides: [
    {
      // 测试文件与 jest setup 需要 jest 全局变量
      files: [
        '__tests__/**/*.js',
        '__tests__/**/*.ts',
        '__tests__/**/*.tsx',
        'jest.setup.js',
        'jest.config.js',
      ],
      env: {
        jest: true,
      },
    },
  ],
};
