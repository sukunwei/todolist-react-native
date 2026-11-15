import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 持久化配置。
 *
 * key 里带版本号（v1），后续如果数据结构变了，改这里的版本号并在
 * `useTaskStore` 的 `migrate` 里写升级逻辑，老用户的数据就不会丢。
 */
export const TASK_STORAGE_KEY = '@todolist/tasks/v1';

export const STORAGE_VERSION = 1;

export { AsyncStorage };
