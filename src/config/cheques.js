// src/config/cheques.js
//
// Çek geçerlilik süresi kuralları — TEK doğruluk kaynağı.
// Hem istemci (Çeklerim ekranı) hem de Cloud Functions tarafındaki
// hatırlatma bildirimi bu değerlere göre çalışır.
//
// ÖNEMLİ: Süre çekin OLUŞTURULMA anında hesaplanıp Firestore'a `expiresAt`
// olarak yazılır. Bu alanı olmayan (bu güncellemeden önce kopartılmış)
// çekler SÜRESİZ kabul edilir — mevcut kullanıcıların çekleri ölmesin diye.

export const CHEQUE_EXPIRY_DAYS = {
  normal: 3,
  romantic: 6,
};

// Bitmesine bu kadar kala push bildirimi gönderilir (Cloud Function).
export const EXPIRY_REMINDER_HOURS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

export const expiryDaysFor = (deckVariant) =>
  deckVariant === 'romantic' ? CHEQUE_EXPIRY_DAYS.romantic : CHEQUE_EXPIRY_DAYS.normal;

/** Oluşturulma anından itibaren son kullanma zamanı (millis). */
export const expiryMillisFor = (deckVariant, fromMillis = Date.now()) =>
  fromMillis + expiryDaysFor(deckVariant) * DAY_MS;

/**
 * Çek süresi dolmuş mu?
 * expiresAtMillis yoksa (eski çekler) ASLA dolmaz.
 * Kullanılmış çekler için süre kavramı işletilmez.
 */
export const isChequeExpired = (cheque, now = Date.now()) => {
  if (!cheque) return false;
  if (cheque.status === 'used') return false;
  if (!cheque.expiresAtMillis) return false;
  return cheque.expiresAtMillis <= now;
};

/** Süresi dolmamış ve kullanılmamış → kullanılabilir. */
export const isChequeUsable = (cheque, now = Date.now()) =>
  !!cheque && cheque.status !== 'used' && !isChequeExpired(cheque, now);

/**
 * Kalan süreyi kısa metne çevirir.
 * Süresiz çeklerde null döner (rozet gösterilmez).
 */
export const formatRemaining = (expiresAtMillis, now = Date.now()) => {
  if (!expiresAtMillis) return null;
  const diff = expiresAtMillis - now;
  if (diff <= 0) return 'Süresi doldu';

  const HOUR_MS = 60 * 60 * 1000;

  // 24 saatten fazlaysa GÜN olarak, EN YAKINA yuvarlayarak göster.
  // Yukarı yuvarlamak, sunucu saatiyle arasındaki birkaç saniyelik fark
  // yüzünden 6 günlük çeke "7 gün kaldı" dedirtiyordu; aşağı yuvarlamak da
  // taze 3 günlük çeke "2 gün kaldı" dedirtiyordu.
  if (diff >= DAY_MS) return `${Math.round(diff / DAY_MS)} gün kaldı`;

  // Son 24 saat: saat cinsinden (bildirim de bu aralıkta gidiyor).
  if (diff >= HOUR_MS) return `${Math.floor(diff / HOUR_MS)} saat kaldı`;

  return `${Math.max(1, Math.floor(diff / 60000))} dk kaldı`;
};

/** Son 24 saate girdi mi? (rozet kırmızıya döner) */
export const isExpiringSoon = (expiresAtMillis, now = Date.now()) => {
  if (!expiresAtMillis) return false;
  const diff = expiresAtMillis - now;
  return diff > 0 && diff <= DAY_MS;
};
