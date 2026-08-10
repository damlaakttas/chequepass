// src/utils/moderation.js
//
// Kullanıcı üretimi içerik (mesajlaşma) için içerik denetimi.
//
// App Store Guideline 1.2, kullanıcıların birbirine serbest metin yazabildiği
// uygulamalarda şunları zorunlu tutuyor:
//   1. Uygunsuz içeriği süzen bir yöntem   → buradaki filtre
//   2. Şikayet mekanizması                  → ChatScreen "Şikayet et"
//   3. Kullanıcıyı engelleme                → ChatScreen / Profil "Engellenenler"
//   4. Yayınlanmış iletişim bilgisi         → config/legal.js
//
// Filtre kasıtlı olarak "gönderimi engelleyen" biçimde çalışıyor: uygunsuz
// kelime tespit edilirse mesaj hiç oluşturulmuyor. Mükemmel değil (hiçbir
// filtre değil) ama iyi niyetli ve görünür bir önlem.

export const MAX_MESSAGE_LENGTH = 500;

// Küçük harfe çevirirken Türkçe'ye özgü İ/I sorununu düzeltir.
const lower = (s) =>
  String(s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr');

// Harf yerine rakam/sembol koyarak filtreyi atlatmayı zorlaştırır.
const DELEET = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
};

const normalize = (text) => {
  let out = lower(text);
  out = out.replace(/[013457@$]/g, (c) => DELEET[c] || c);
  // Türkçe karakterleri sadeleştir (küfürün "ş/ç/ı" varyantlarını yakalamak için)
  out = out
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[ıİ]/g, 'i');
  // Harf dışı her şeyi boşluğa çevir (araya konan nokta/tire hilesi)
  out = out.replace(/[^a-z]+/g, ' ').trim();
  return ` ${out} `;
};

// Aynı metnin üç okunuşu: kaçamak yöntemlerini kapatmak için hepsine bakılır.
//   spaced   → " a m k "        (kelime bazlı kontrol)
//   packed   → "amk"            ("a.m.k", "o r o s p u" hilesi)
//   squashed → tekrarlar tek    ("amıııına" → "amina")
const variants = (text) => {
  const spaced = normalize(text);
  // Tek harf tek harf yazılmış kelimeleri birleştir: " a m k " → " amk "
  const joined = spaced.replace(
    /(?:^|\s)((?:[a-z]\s){1,}[a-z])(?=\s|$)/g,
    (m, g) => ` ${g.replace(/\s/g, '')} `
  );
  const packed = spaced.replace(/\s+/g, '');
  const squashed = packed.replace(/(.)\1+/g, '$1');
  return { spaced, joined, packed, squashed };
};

// Uzun kökler: kelimenin İÇİNDE geçmesi yeterli ("orospuluk" da yakalanır).
// Türkçede yanlış pozitif üretebilecek belirsiz kökler (ör. "sikiş" ↔ "sıkış")
// bilerek DIŞARIDA bırakıldı — masum mesajları engellemek daha kötü.
const BLOCKED_ROOTS = [
  // Türkçe
  'amina', 'aminakoyay', 'amcik', 'amcigi', 'ananisikeyim',
  'sikeyim', 'sikerim', 'siktir', 'siktimin', 'siktir',
  'orospu', 'kahpe', 'pezevenk', 'gavat', 'kaltak',
  'yarrak', 'gotveren', 'gotlek', 'ibne', 'pust',
  'piclik', 'pickurusu', 'gebertirim', 'gebertecegim',
  // İngilizce
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'whore', 'slut',
  'bastard', 'dickhead', 'motherfuck', 'faggot', 'nigger',
];

// Kısa kısaltmalar: yalnızca TAM KELİME olarak eşleşir.
// Aksi halde "ocak", "maki" gibi masum kelimelerin içinde yakalanırlardı.
const BLOCKED_WORDS = ['amk', 'aq', 'mk', 'oc', 'oç', 'sg'];

/**
 * Mesajda engellenmesi gereken bir ifade var mı?
 * @returns {{ blocked: boolean, term?: string }}
 */
export const checkMessage = (text) => {
  if (!text || !text.trim()) return { blocked: false };
  const { spaced, joined, packed, squashed } = variants(text);

  for (const word of BLOCKED_WORDS) {
    const w = word
      .replace(/[şŞ]/g, 's')
      .replace(/[çÇ]/g, 'c')
      .replace(/[ıİ]/g, 'i')
      .replace(/[^a-z]/g, '');
    if (!w) continue;
    if (spaced.includes(` ${w} `) || joined.includes(` ${w} `)) {
      return { blocked: true, term: word };
    }
  }

  for (const root of BLOCKED_ROOTS) {
    if (packed.includes(root) || squashed.includes(root)) {
      return { blocked: true, term: root };
    }
  }
  return { blocked: false };
};

/**
 * Gönderilmeden önce mesajı doğrular.
 * @returns {{ ok: boolean, error?: string, value?: string }}
 */
export const validateMessage = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, error: 'Mesaj boş olamaz' };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir` };
  }
  const check = checkMessage(trimmed);
  if (check.blocked) {
    return {
      ok: false,
      error: 'Bu mesaj uygunsuz ifade içeriyor ve gönderilemez. Lütfen yeniden yaz.',
    };
  }
  return { ok: true, value: trimmed };
};

export const REPORT_REASONS = [
  { key: 'harassment', label: 'Taciz veya hakaret' },
  { key: 'sexual', label: 'Uygunsuz cinsel içerik' },
  { key: 'spam', label: 'Spam veya dolandırıcılık' },
  { key: 'threat', label: 'Tehdit veya şiddet' },
  { key: 'other', label: 'Diğer' },
];
