// src/services/ads.js
//
// Ödüllü (rewarded) reklam sarmalayıcı. Pas hakkı bitince kullanılır.
// Native modül (react-native-google-mobile-ads) yoksa (ör. Expo Go) güvenli
// şekilde "reklam yok" döner ve çağıran taraf bonus pas ile devam eder.
//
// ŞİMDİLİK Google'ın resmi TEST reklam birimi kullanılıyor. Gerçek AdMob
// reklam birimi ID'si gelince REWARDED_UNIT_ID_* değerlerini değiştir.

import { Platform } from 'react-native';

let mobileAds = null;
let RewardedAd = null;
let RewardedAdEventType = null;
let AdEventType = null;
let TestIds = null;

try {
  const m = require('react-native-google-mobile-ads');
  mobileAds = m.default;
  RewardedAd = m.RewardedAd;
  RewardedAdEventType = m.RewardedAdEventType;
  AdEventType = m.AdEventType;
  TestIds = m.TestIds;
} catch (e) {
  // Native modül yok — reklamsız çalış.
}

let initialized = false;
export async function initAds() {
  if (!mobileAds || initialized) return;
  try {
    await mobileAds().initialize();
    initialized = true;
  } catch (e) {
    console.warn('AdMob init failed', e);
  }
}

// TODO(gerçek AdMob): TestIds.REWARDED yerine kendi reklam birimi ID'in:
//   iOS:     'ca-app-pub-XXXXXXXX/YYYYYYYY'
//   Android: 'ca-app-pub-XXXXXXXX/ZZZZZZZZ'
const REWARDED_UNIT_ID = TestIds ? TestIds.REWARDED : '';

/**
 * Ödüllü reklamı yükler ve gösterir.
 * @returns {Promise<{available:boolean, rewarded:boolean}>}
 *   available=false → reklam altyapısı yok/yüklenemedi (çağıran fallback yapmalı)
 *   rewarded=true   → kullanıcı reklamı sonuna kadar izledi, ödül hak edildi
 */
export function showRewardedAd() {
  return new Promise((resolve) => {
    if (!RewardedAd || !REWARDED_UNIT_ID) {
      resolve({ available: false, rewarded: false });
      return;
    }
    // Reklam altyapısını sadece burada (gösterim anında) başlat.
    initAds();
    try {
      const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
      let earned = false;
      let settled = false;
      const done = (res) => {
        if (settled) return;
        settled = true;
        try { unsubEarned(); unsubLoaded(); unsubClosed(); unsubError(); } catch (e) {}
        resolve(res);
      };

      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        try { ad.show(); } catch (e) { done({ available: false, rewarded: false }); }
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        done({ available: true, rewarded: earned });
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        done({ available: false, rewarded: false });
      });

      ad.load();

      // Güvenlik: 15 sn içinde yüklenmezse fallback.
      setTimeout(() => done({ available: false, rewarded: false }), 15000);
    } catch (e) {
      resolve({ available: false, rewarded: false });
    }
  });
}
