import { ColorSchemeName } from 'react-native';

export function getDriverPalette(colorScheme?: ColorSchemeName) {
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    background: isDark ? '#08111F' : '#FFFFFF',
    surface: isDark ? '#101B2D' : '#FFFFFF',
    surfaceAlt: isDark ? '#162235' : '#F9FAFB',
    surfaceMuted: isDark ? '#19283D' : '#F3F4F6',
    input: isDark ? '#18263A' : '#F3F4F6',
    iconButton: isDark ? '#1A2740' : '#F3F4F6',
    border: isDark ? '#26354A' : '#E5E7EB',
    text: isDark ? '#F8FAFC' : '#111827',
    textMuted: isDark ? '#94A3B8' : '#6B7280',
    textSoft: isDark ? '#CBD5E1' : '#475569',
    primary: '#0B63F6',
    primaryMuted: isDark ? '#0D274B' : '#EFF6FF',
    primaryBorder: isDark ? '#21477E' : '#BFDBFE',
    successMuted: isDark ? '#10281A' : '#DCFCE7',
    successBorder: isDark ? '#1D5F34' : '#86EFAC',
    successText: isDark ? '#86EFAC' : '#166534',
    dangerMuted: isDark ? '#33161A' : '#FEF2F2',
    dangerBorder: isDark ? '#7F1D1D' : '#FECACA',
    dangerText: isDark ? '#FCA5A5' : '#991B1B',
    overlay: isDark ? 'rgba(3, 8, 20, 0.72)' : 'rgba(15, 23, 42, 0.12)',
  };
}
