// AEGIS Design System Tokens
// Dark futuristic theme with purple/pink gradient accents

export const colors = {
  background: {
    base: '#06040A',
    surface: '#0E0914',
    surfaceElevated: '#181124',
  },
  brand: {
    primary: '#7000FF',
    secondary: '#FF2079',
    gradientStart: '#7000FF',
    gradientMid: '#B800E6',
    gradientEnd: '#FF2079',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A19EB5',
    tertiary: '#6C6885',
  },
  strokes: {
    glass: 'rgba(255, 255, 255, 0.12)',
    glassSoft: 'rgba(255, 255, 255, 0.08)',
    accent: 'rgba(112, 0, 255, 0.4)',
  },
  glass: {
    cardBg: 'rgba(20, 15, 30, 0.4)',
    buttonBg: 'rgba(255, 255, 255, 0.1)',
  },
  status: {
    active: '#00F0FF',
    warning: '#FFB800',
    danger: '#FF2079',
  },
};

export const gradients = {
  brand: [colors.brand.gradientStart, colors.brand.gradientMid, colors.brand.gradientEnd] as const,
  brandSoft: ['rgba(112,0,255,0.18)', 'rgba(255,32,121,0.18)'] as const,
  textBrand: [colors.brand.gradientStart, colors.brand.gradientEnd] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 64,
  screenPadding: 24,
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 100,
};

export const typography = {
  family: {
    heading: 'Outfit_700Bold',
    headingExtra: 'Outfit_800ExtraBold',
    headingSemi: 'Outfit_600SemiBold',
    body: 'PlusJakartaSans_400Regular',
    bodyMed: 'PlusJakartaSans_500Medium',
    bodySemi: 'PlusJakartaSans_600SemiBold',
  },
  scale: {
    h1: { fontSize: 48, lineHeight: 52, letterSpacing: -1.5 },
    h2: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
    h3: { fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
    bodyLg: { fontSize: 18, lineHeight: 28 },
    bodyBase: { fontSize: 16, lineHeight: 24 },
    bodySm: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  },
};

export const motion = {
  durations: {
    fast: 200,
    medium: 500,
    slow: 1000,
    cinematic: 2000,
  },
};

export const glass = {
  card: {
    backgroundColor: colors.glass.cardBg,
    borderColor: colors.strokes.glassSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  button: {
    backgroundColor: colors.glass.buttonBg,
    borderColor: colors.strokes.glass,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
};
