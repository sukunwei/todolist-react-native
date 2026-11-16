import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

/**
 * 觸感回饋封裝。
 *
 * 模擬器裡沒有觸感硬體、原生模塊也可能缺失，所以全部吞掉異常做靜默降級——
 * 觸感屬於錦上添花，絕不能因為它讓 App 崩潰。
 */

const OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

function trigger(type: string): void {
  try {
    ReactNativeHapticFeedback.trigger(type as never, OPTIONS);
  } catch {
    // 靜默降級
  }
}

/** 輕點：勾選、排序等常規操作 */
export function tapFeedback(): void {
  trigger('impactLight');
}

/** 成功：刪除、完成等有結果的操作 */
export function successFeedback(): void {
  trigger('notificationSuccess');
}

/** 警告：破壞性操作 */
export function warningFeedback(): void {
  trigger('notificationWarning');
}
