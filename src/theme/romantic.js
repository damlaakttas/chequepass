// src/theme/romantic.js
//
// Romantik paketin TEK doğruluk kaynağı.
// Kart renkleri, arka plan tonları ve varyant yardımcıları burada tanımlı.
// Böylece HomeScreen / ChequesScreen / DeckCard aynı paleti paylaşır ve
// "bir ekranda kırmızı, diğerinde normal" tutarsızlığı oluşmaz.

export const ROMANTIC_VARIANT = 'romantic';
export const NORMAL_VARIANT = 'normal';

// Kart yüzü/sırtı için kırmızı-gül tonları.
export const ROMANTIC_CARD_COLORS = [
  '#dc2626',
  '#e11d48',
  '#be123c',
  '#f43f5e',
  '#b91c1c',
  '#e8506b',
];

// Ekran/satır temaları.
export const ROMANTIC = {
  heart: '#e11d48',
  heartSoft: '#fb7185',
  accent: '#dc2626',
  accentDark: '#9f1239',
  gradient: ['#fff5f7', '#fde9ed', '#f7dbe1'],
  rowBg: '#fff1f3',
  rowBorder: '#fbcfd6',
  chipBg: '#fee2e6',
};

export const isRomanticVariant = (variant) => variant === ROMANTIC_VARIANT;

// Kart nesnesinden bağımsız, rastgele bir romantik ton.
export const pickRomanticColor = () =>
  ROMANTIC_CARD_COLORS[Math.floor(Math.random() * ROMANTIC_CARD_COLORS.length)];

/**
 * Bir deste kartını aktif varyanta göre boyar.
 * Romantik varyantta kartın Firestore'daki rengi yok sayılır ve
 * kırmızı tonlarından biri atanır. Diğer alanlar korunur.
 */
export const tintTemplate = (template, variant) => {
  if (!template) return template;
  if (!isRomanticVariant(variant)) return template;
  return { ...template, color: pickRomanticColor() };
};

/**
 * Idle (kapalı kart) rengini varyanta göre üretir.
 * cards boşsa null döner; çağıran taraf "deste boş" durumunu gösterir.
 */
export const resolveIdleColor = (variant, cards) => {
  if (isRomanticVariant(variant)) return pickRomanticColor();
  if (cards && cards.length) {
    return cards[Math.floor(Math.random() * cards.length)].color;
  }
  return null;
};
