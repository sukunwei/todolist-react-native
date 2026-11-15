/**
 * Jest 全局 setup。
 *
 * AsyncStorage 在 Jest 环境下没有原生实现，必须用官方提供的 mock 替换，
 * 否则任何触发持久化的用例都会抛 "NativeModule: AsyncStorage is null"。
 *
 * 注意：mock 路径 `@react-native-async-storage/async-storage/jest/async-storage-mock`
 * 只存在于 2.x。3.x 是 ESM-only 且 mock 路径改为了 `@react-native-async-storage/
 * async-storage/jest`，两者不兼容——本项目锁定 2.2.0，不要升级到 3.x。
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// 触感反馈是原生模块，Jest 下没有实现，用空函数替换。
// 真实运行时由 src/utils/haptics.ts 里的 try/catch 兜底，这里只是让
// 组件能在测试中正常 import。
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  trigger: jest.fn(),
}));
