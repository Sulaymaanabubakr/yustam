// YUSTAM Brand Colors and Theme Constants

export const Colors = {
  // Primary Colors
  emerald: '#004D40',
  emeraldDark: '#003D34',
  orange: '#F3731E',
  orangeDeep: '#E05E0E',
  beige: '#EADCCF',
  white: '#FFFFFF',
  
  // Neutral Colors
  ink: '#111111',
  gray: '#666666',
  lightGray: '#999999',
  border: '#E0E0E0',
  background: '#F5F5F5',
  
  // Status Colors
  success: '#1B8A5A',
  error: '#D84315',
  warning: '#FFB300',
  info: '#0F6A53',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export default {
  Colors,
  Spacing,
  BorderRadius,
  FontSizes,
  FontWeights,
  Shadows,
};
