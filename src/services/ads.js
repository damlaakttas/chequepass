// src/services/ads.js
//
// Ödüllü (rewarded) reklam sarmalayıcı. Pas hakkı bitince kullanılır.
// Native modül (react-native-google-mobile-ads) yoksa (ör. Expo Go) güvenli
// şekilde "reklam yok" döner ve çağıran taraf bonus pas ile devam eder.
//
// Reklam birimi kimlikleri src/config/ads.js dosyasından gelir. Orada gerçek
// kimlik tanımlı değilse (ya da kullanıcı test hesabıysa) Google'ın resmi
// TEST reklamı kullanılır.
//
// TEŞHİS: Her başarısızlık bir `reason` ile döner. Test hesaplarında bu neden
// kullanıcıya gösterilir, böylece "reklam gelmedi" durumunu körlemesine
// aramak zorunda kalmayız.

import {
  getRewardedUnitId,
  NON_PERSONALIZED_ONLY,
  AD_LOAD_TIMEOUT_MS,
} from '../config/ads';

let mobileAds = null;
let RewardedAd = null;
let RewardedAdEventType = null;
let AdEventType = null;
let TestIds = null;
let importError = null;

try {
  const m = require('react-native-google-mobile-ads');
  // Metro'nun ESM/CJS ara katmanına göre default farklı yerde olabilir.
  mobileAds = m.default || m.mobileAds || (typeof m === 'function' ? m : null);
  RewardedAd = m.RewardedAd;
  RewardedAdEventType = m.RewardedAdEventType;
  AdEventType = m.AdEventType;
  TestIds = m.TestIds;
} catch (e) {
  importError = e?.message || 'require failed';
}

// 'idle' | 'ok' | 'failed' | 'unavailable'
let initState = mobileAds ? 'idle' : 'unavailable';
let initPromise = null;
let lastInitError = null;

/** Reklam altyapısı bu build'de var mı? (Expo Go'da yok) */
export const adsAvailable = () => !!RewardedAd && !!mobileAds;

/**
 * SDK'yı başlat. Uygulama açılışında çağrılır ve reklam gösterilmeden önce
 * BEKLENİR — Google SDK'sı initialize() tamamlanmadan reklam yüklemeyi
 * reddediyor. (Önceki sürümde beklenmiyordu; reklamın gelmemesinin sebebi buydu.)
 */
export function initAds() {
  if (!mobileAds) return Promise.resolve(false);
  if (initState === 'ok') return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await mobileAds().initialize();
      initState = 'ok';
      return true;
    } catch (e) {
      initState = 'failed';
      lastInitError = e?.message || String(e);
      console.warn('AdMob init failed:', lastInitError);
      initPromise = null; // bir sonraki denemede tekrar dene
      return false;
    }
  })();

  return initPromise;
}

/** Sorun ararken bakılacak özet. */
export const getAdDiagnostics = (opts = {}) => ({
  moduleLoaded: !!RewardedAd,
  mobileAdsFn: !!mobileAds,
  importError,
  initState,
  lastInitError,
  usingTestAd: !getRewardedUnitId(opts),
});

/**
 * Kullanılacak reklam birimi: config'de gerçek kimlik varsa ve kullanıcı test
 * hesabı değilse o, aksi halde Google'ın resmi test reklamı.
 */
const resolveUnitId = (opts) => {
  const real = getRewardedUnitId(opts);
  if (real) return real;
  return TestIds ? TestIds.REWARDED : '';
};

/**
 * Ödüllü reklamı yükler ve gösterir.
 *
 * @param {{ email?: string }} opts Giriş yapmış kullanıcının e-postası.
 * @returns {Promise<{available:boolean, rewarded:boolean, reason:string}>}
 *   available=false → reklam gösterilemedi, çağıran fallback yapmalı
 *   rewarded=true   → kullanıcı reklamı sonuna kadar izledi
 */
export async function showRewardedAd(opts = {}) {
  if (!RewardedAd) {
    return { available: false, rewarded: false, reason: `modul-yok${importError ? ': ' + importError : ''}` };
  }

  const unitId = resolveUnitId(opts);
  if (!unitId) {
    return { available: false, rewarded: false, reason: 'reklam-birimi-yok' };
  }

  // SDK hazır olmadan yükleme yapma.
  const ready = await initAds();
  if (!ready) {
    return { available: false, rewarded: false, reason: `sdk-baslamadi: ${lastInitError || 'bilinmiyor'}` };
  }

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    let loadTimer = null;
    const unsubs = [];

    const done = (res) => {
      if (settled) return;
      settled = true;
      if (loadTimer) clearTimeout(loadTimer);
      unsubs.forEach((u) => {
        try { u && u(); } catch (e) {}
      });
      resolve(res);
    };

    try {
      const ad = RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: NON_PERSONALIZED_ONLY,
      });

      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        })
      );

      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          // Reklam yüklendi → zaman aşımını KAPAT.
          // Aksi halde 15 sn sonra, kullanıcı reklamı izlerken akış
          // "başarısız" sayılıyordu (ödüllü reklamlar 15-30 sn sürer).
          if (loadTimer) {
            clearTimeout(loadTimer);
            loadTimer = null;
          }
          try {
            ad.show();
          } catch (e) {
            done({ available: false, rewarded: false, reason: `gosterilemedi: ${e?.message || e}` });
          }
        })
      );

      unsubs.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          done({ available: true, rewarded: earned, reason: earned ? 'odul-kazanildi' : 'yarida-kapatildi' });
        })
      );

      unsubs.push(
        ad.addAdEventListener(AdEventType.ERROR, (err) => {
          const code = err?.code || err?.message || 'bilinmeyen';
          done({ available: false, rewarded: false, reason: `reklam-hatasi: ${code}` });
        })
      );

      ad.load();

      // Zaman aşımı SADECE yükleme aşamasını kapsar.
      loadTimer = setTimeout(() => {
        done({ available: false, rewarded: false, reason: 'yukleme-zaman-asimi' });
      }, AD_LOAD_TIMEOUT_MS);
    } catch (e) {
      done({ available: false, rewarded: false, reason: `istisna: ${e?.message || e}` });
    }
  });
}
