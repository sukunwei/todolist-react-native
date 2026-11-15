module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // 以下依赖以 ESM 发布（或位于 @ 作用域下），需要转译后再运行。
  //
  // 注意：React Navigation 的包名是 `@react-navigation/...`，白名单里必须带 `@`
  // 前缀。因为本正则的前瞻锚定在 `node_modules/` 之后，写成 `react-navigation`
  // 永远匹配不到 `node_modules/@react-navigation/native/...`，会导致所有引用导航的
  // 测试报 "Cannot use import statement outside a module"。
  //
  // 另外 zustand@5.1.0 是 CommonJS（`type: commonjs`，react-native 导出条件指向
  // CJS 入口），严格来说不需要转义；这里列出来是无害的冗余。
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '@react-native',
        'react-native',
        '@react-navigation',
        '@react-native-async-storage',
      ].join('|') +
      ')/)',
  ],
};
