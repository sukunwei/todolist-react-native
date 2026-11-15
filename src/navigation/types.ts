import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  TaskList: undefined;
  /** taskId 为空表示新建，有值表示编辑 */
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
