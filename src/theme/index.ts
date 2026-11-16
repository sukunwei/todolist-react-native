import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { fontSize, fontWeight, radius, spacing } from './spacing';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  isDark: boolean;
}

/**
 * 主題 hook。跟隨系統深淺色。
 *
 * 用法：`const theme = useTheme();` 然後 `theme.colors.primary` 等。
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();

  return useMemo(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      spacing,
      radius,
      fontSize,
      fontWeight,
      isDark: scheme === 'dark',
    }),
    [scheme],
  );
}

export { lightColors, darkColors };
export type { ThemeColors };
