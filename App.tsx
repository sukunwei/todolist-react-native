/**
 * TODOLIST — 本機待辦清單 App
 *
 * 入口：SafeAreaProvider → StatusBar → RootNavigator
 * 資料全部保存在裝置本機（AsyncStorage），不連線、不蒐集任何資料。
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
