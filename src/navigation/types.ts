import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  TaskList: undefined;
  /** taskId 為空表示新增，有值表示編輯 */
  TaskEditor: { taskId?: string } | undefined;
};

export type TaskListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TaskList'
>;

export type TaskEditorScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TaskEditor'
>;
