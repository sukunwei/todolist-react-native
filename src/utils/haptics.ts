import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

/**
 * 触感反馈封装。
 *
 * 模拟器里没有触感硬件、原生模块也可能缺失，所以全部吞掉异常做静默降级——
 * 触感属于锦上添花，绝不能因为它让 App 崩溃。
 */

const OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

function trigger(type: string): void {
  try {
    ReactNativeHapticFeedback.trigger(type as never, OPTIONS);
  } catch {
    // 静默降级
  }
}

/** 轻点：勾选、排序等常规操作 */
export function tapFeedback(): void {
  trigger('impactLight');
}

/** 成功：删除、完成等有结果的操作 */
export function successFeedback(): void {
  trigger('notificationSuccess');
}

/** 警告：破坏性操作 */
export function warningFeedback(): void {
  trigger('notificationWarning');
}
