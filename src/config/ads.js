// src/config/ads.js
//
// AdMob reklam birimi kimlikleri.
//
// İKİ FARKLI KİMLİK TÜRÜ VAR, KARIŞTIRMA:
//   1. Uygulama Kimliği (App ID)  → içinde ~ var → app.json'daki plugin bloğunda
//   2. Reklam Birimi Kimliği      → içinde / var → BU DOSYADA
//
// AdMob panelinde: Reklam birimleri → Ödüllü (Rewarded) reklam biriminin
// kimliğini buraya yapıştır. Boş bırakılırsa Google'ın resmi TEST reklamı
// kullanılır — geliştirme sırasında güvenli olan budur.
//
// UYARI: Kendi cihazında GERÇEK reklama dokunma. AdMob bunu geçersiz tıklama
// sayar ve hesabını kapatabilir. Test ederken ya test kimliğini bırak ya da
// cihazını AdMob'da "test cihazı" olarak tanımla.

import { Platform } from 'react-native';

// Ödüllü reklam birimi kimlikleri (ca-app-pub-XXXX/YYYY biçiminde).
const REWARDED_UNIT_IDS = {
  ios: 'ca-app-pub-8764962271203956/2821234875',
  // Android uygulaması AdMob'da henüz oluşturulmadı. Boş kaldığı sürece
  // Android'de otomatik olarak Google'ın test reklamı gösterilir.
  android: '',
};

// TEST HESAPLARI
//
// Buradaki e-postalarla giriş yapan kullanıcılara HER ZAMAN Google'ın test
// reklamı gösterilir — uygulama canlıda olsa bile. Yani biz test ederken
// reklama dokunmaktan çekinmemize gerek yok; AdMob geçersiz tıklama saymaz,
// hesap riske girmez. Gerçek kullanıcılar gerçek reklamı görmeye devam eder.
//
// Yeni bir test kullanıcısı eklemek için e-postasını listeye yaz ve
// `eas update` ile gönder — yeni build gerekmez.
const TEST_AD_ACCOUNTS = [
  'damlaaktas.a@gmail.com',
  'ylmzzzberk@gmail.com',
  // Test için kullandığın diğer hesapları da buraya ekle.
];

/** Bu e-posta bir test hesabı mı? */
export const isTestAdAccount = (email) => {
  if (!email) return false;
  return TEST_AD_ACCOUNTS.some((e) => e.toLowerCase() === String(email).toLowerCase());
};

// Acil durum anahtarı: true yapılırsa HERKESE test reklamı gösterilir.
// Reklam tarafında bir sorun çıkarsa geliri durdurup akışı ayakta tutmak için.
export const FORCE_TEST_ADS = false;

// Reklam gelmediğinde test hesaplarına teknik nedeni gösterir.
// Normalde KAPALI; "reklam neden gelmedi" diye araştırırken true yapıp
// `eas update` ile gönder, sorunu görünce tekrar false yap.
export const SHOW_AD_DIAGNOSTICS = false;

/**
 * Platforma göre gerçek reklam birimi kimliği.
 * Test hesabıysa ya da kimlik tanımlı değilse null döner → test reklamı.
 */
export const getRewardedUnitId = ({ email } = {}) => {
  if (FORCE_TEST_ADS || isTestAdAccount(email)) return null;
  const id = Platform.OS === 'ios' ? REWARDED_UNIT_IDS.ios : REWARDED_UNIT_IDS.android;
  return id && id.startsWith('ca-app-pub-') ? id : null;
};

// Reklamlar KİŞİSELLEŞTİRİLMEMİŞ olarak isteniyor: IDFA kullanılmaz,
// kullanıcı takibi yapılmaz, bu yüzden ATT (izleme izni) ekranı gerekmez.
export const NON_PERSONALIZED_ONLY = true;

// Reklam yüklenemezse kullanıcı mağdur olmasın: bonus pas yine verilir.
// Reklam açılıp yarıda kapatılırsa ödül VERİLMEZ.
export const GRANT_ON_AD_UNAVAILABLE = true;

// Reklamın yüklenmesi için beklenecek süre.
export const AD_LOAD_TIMEOUT_MS = 15000;
