// src/utils/helpers.js
export const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatRelative = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} gün önce`;
  return formatDate(ts);
};

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

// ---- E-posta yazım hatası yakalayıcı ---------------------------------------
//
// Doğrulama e-postası ulaşmayan bir adrese kayıt olmak, kullanıcı adının
// boşuna rezerve edilmesine yol açıyor. Gerçekte var olup olmadığını
// anlayamayız ama YAYGIN YAZIM HATALARINI yakalayabiliriz: "gmail.con",
// "hotmial.com", "gmial.com" gibi.

const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'yandex.com',
  'protonmail.com',
  'me.com',
  'aol.com',
];

// Yaygın uzantı hataları — mesafe hesabına gerek kalmadan yakalanır.
const TLD_TYPOS = {
  con: 'com',
  cmo: 'com',
  ocm: 'com',
  co: 'com',
  cim: 'com',
  comm: 'com',
  cop: 'com',
  ckm: 'com',
};

// Levenshtein mesafesi (küçük girdiler için yeterli).
const editDistance = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
};

/**
 * Adreste olası bir yazım hatası varsa düzeltilmiş halini döner, yoksa null.
 * Örn: "damla@gmail.con" → "damla@gmail.com"
 */
export const suggestEmailFix = (email) => {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain || !local) return null;

  // 1) Doğru bilinen bir alan adıysa dokunma.
  if (COMMON_DOMAINS.includes(domain)) return null;

  // 2) Uzantı hatası (gmail.con → gmail.com)
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    if (TLD_TYPOS[tld]) {
      const fixedDomain = [...parts.slice(0, -1), TLD_TYPOS[tld]].join('.');
      return `${local}@${fixedDomain}`;
    }
  }

  // 3) Alan adının kendisinde harf hatası (gmial.com → gmail.com)
  let best = null;
  let bestDist = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const d = editDistance(domain, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  // Sadece çok yakın eşleşmelerde öner; kurumsal adresleri yanlışlıkla
  // "düzeltmemek" için eşik dar tutuldu.
  if (best && bestDist > 0 && bestDist <= 2 && domain.length >= 5) {
    return `${local}@${best}`;
  }

  return null;
};
