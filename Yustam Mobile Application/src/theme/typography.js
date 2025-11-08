// Typography configuration for YUSTAM
const fontFamily = {
  anton: 'Anton_400Regular',
  inter: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
};

const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
};

const lineHeight = {
  tight: 1.15,
  normal: 1.5,
  relaxed: 1.6,
  loose: 1.75,
};

const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
};

const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const typography = {
  fontFamily,
  fontSize,
  sizes: fontSize,
  fontFamilyHeading: fontFamily.anton,
  fontFamilyDisplay: fontFamily.anton,
  fontFamilyBody: fontFamily.inter,
  fontFamilyMono: fontFamily.inter,
  lineHeight,
  letterSpacing,
  fontWeight,
};

export default typography;
