// ─── ChequePass Tema — Açık Pastel Mod ────────────────────────────────────────

export const Colors = {
  // Arka plan gradyanı
  gradientStart: '#f5ebec',
  gradientEnd:   '#fcd5db',

  // Kart / içerik yüzeyleri
  surface:       '#f6f7f3',
  surfaceAlt:    '#ffffff',

  // Vurgu renkleri
  yellow:        '#E6E99F',   // buton seçili, tab seçili
  teal:          '#9FD6C8',   // ikincil vurgu
  peach:         '#fdb29a',   // kategori etiketi 1
  pink:          '#fac5cd',   // kategori etiketi 2
  lavender:      '#cbb9e1',   // kategori etiketi 3
  mint:          '#b8e8d8',   // kategori etiketi 4

  // Ana marka rengi (koyu mor — logo & aksanlarda)
  brand:         '#5118A9',
  brandLight:    '#7B3FD4',
  brandDark:     '#3A0E7A',
  accent:        '#F27A17',   // turuncu vurgu (pas ikonu vs)

  // Metin
  textPrimary:   '#1a1030',
  textSecondary: '#4a3d6b',
  textMuted:     '#8b7aaa',
  textHint:      '#b8adc8',

  // Durum
  success:       '#2ecc8a',
  error:         '#e74c3c',
  warning:       '#F27A17',

  // Sınır
  border:        'rgba(81,24,169,0.12)',
  borderStrong:  'rgba(81,24,169,0.25)',

  // Tab bar
  tabBg:         '#f0e8f8',
  tabSelected:   '#E6E99F',
  tabIcon:       '#8b7aaa',
  tabIconActive: '#1a1030',
};

export const Typography = {
  fontBrand:    'CormorantGaramond-Bold',
  fontBrandSem: 'CormorantGaramond-SemiBold',
  fontBody:     'DMSans-Regular',
  fontBodyMed:  'DMSans-Medium',
  fontBodySem:  'DMSans-SemiBold',
  fontBodyLt:   'DMSans-Light',

  display:   { fontSize: 34, fontFamily: 'CormorantGaramond-Bold',    color: Colors.textPrimary,   letterSpacing: -0.5, lineHeight: 40 },
  h1:        { fontSize: 26, fontFamily: 'CormorantGaramond-Bold',    color: Colors.textPrimary,   letterSpacing: -0.3, lineHeight: 32 },
  h2:        { fontSize: 20, fontFamily: 'DMSans-SemiBold',           color: Colors.textPrimary,   lineHeight: 26 },
  h3:        { fontSize: 17, fontFamily: 'DMSans-SemiBold',           color: Colors.textPrimary,   lineHeight: 22 },
  body:      { fontSize: 15, fontFamily: 'DMSans-Regular',            color: Colors.textPrimary,   lineHeight: 22 },
  bodyMed:   { fontSize: 15, fontFamily: 'DMSans-Medium',             color: Colors.textPrimary,   lineHeight: 22 },
  bodySm:    { fontSize: 13, fontFamily: 'DMSans-Regular',            color: Colors.textSecondary, lineHeight: 19 },
  caption:   { fontSize: 11, fontFamily: 'DMSans-Medium',             color: Colors.textMuted,     letterSpacing: 0.06, lineHeight: 16 },
  label:     { fontSize: 14, fontFamily: 'DMSans-SemiBold',           color: Colors.textPrimary,   lineHeight: 18 },
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

export const Shadow = {
  soft: {
    shadowColor: '#5118A9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#fac5cd',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Kategori etiket renkleri (round-robin)
export const CategoryColors = ['#fdb29a', '#fac5cd', '#cbb9e1', '#9FD6C8', '#E6E99F', '#b8e8d8'];
export function categoryColor(index: number) {
  return CategoryColors[index % CategoryColors.length];
}
