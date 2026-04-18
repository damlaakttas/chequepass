// src/theme/theme.js
export const COLORS = {
  primary: '#add7c4',
  primaryDark: '#8fc0aa',
  secondary: '#ebf381',
  secondaryDark: '#d4dc66',
  background: '#f0e9e9',
  surface: '#ffffff',
  text: '#1f2937',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  border: '#e5e7eb',
  success: '#34d399',
  danger: '#ef4444',
  warning: '#f59e0b',
  shadow: 'rgba(31, 41, 55, 0.08)',
  overlay: 'rgba(31, 41, 55, 0.45)',
};

export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const SHADOW = {
  soft: {
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  medium: {
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  strong: {
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
};
