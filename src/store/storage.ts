import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 持久化配置。
 *
 * key 裡帶版本號（v1），後續如果資料結構變了，改這裡的版本號並在
 * `useTaskStore` 的 `migrate` 裡寫升級邏輯，老使用者的資料就不會丟。
 */
export const TASK_STORAGE_KEY = '@todolist/tasks/v1';

export const STORAGE_VERSION = 1;

export { AsyncStorage };
