// src/context/PremiumContext.js
//
// RevenueCat sarmalayıcı. EAS Build sürecinde production mode'a geçer.
//
// MOCK MODE (default): Expo Go'da çalışır, AsyncStorage'da `premium=true` yazar.
// Tek tuşla satın alma simüle edilir, gerçek ödeme yok.
//
// PRODUCTION MODE: EAS Build sonrası `react-native-purchases` paketi yüklendikten
// sonra `USE_REVENUECAT` true yapılır. RevenueCat SDK gerçek satın almayı yönetir.
//
// EAS Build'e geçince yapılacaklar README'de.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PremiumContext = createContext(null);

const PREMIUM_KEY = '@chequepass_premium_v1';

// Production'a geçince bu true olacak
const USE_REVENUECAT = true;

// RevenueCat ürün ID'si (App Store Connect & RevenueCat'te aynı olmalı)
export const ROMANTIC_PRODUCT_ID = 'chequepass.romantic.lifetime';
export const ROMANTIC_ENTITLEMENT = 'romantic_pack';

let Purchases = null;
if (USE_REVENUECAT) {
  // EAS Build sonrası bu satır çalışır
  Purchases = require('react-native-purchases').default;
}

export const PremiumProvider = ({ children }) => {
  const [hasRomantic, setHasRomantic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState(null);

  // Mount: önceki satın alımı kontrol et
  useEffect(() => {
    (async () => {
      try {
        if (USE_REVENUECAT && Purchases) {
          // RevenueCat init - API key Apple App Store için
          await Purchases.configure({
            apiKey: 'appl_YYwcRYYMcCSrBdahMNMYavEOwqA',
          });
          const customerInfo = await Purchases.getCustomerInfo();
          const isActive = !!customerInfo.entitlements.active[ROMANTIC_ENTITLEMENT];
          setHasRomantic(isActive);
          // Offering'leri çek
          try {
            const offs = await Purchases.getOfferings();
            setOfferings(offs.current);
          } catch (e) { console.warn('Offerings fetch failed', e); }
        } else {
          // MOCK: AsyncStorage'dan oku
          const v = await AsyncStorage.getItem(PREMIUM_KEY);
          setHasRomantic(v === 'true');
        }
      } catch (e) {
        console.warn('Premium init failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Satın alma akışı.
   * Production'da Purchases.purchasePackage() çağrılır.
   * Mock'ta direkt AsyncStorage'a yazılır.
   */
  const purchaseRomantic = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (USE_REVENUECAT && Purchases && offerings) {
        const pkg = offerings.availablePackages.find(
          (p) => p.product.identifier === ROMANTIC_PRODUCT_ID
        );
        if (!pkg) throw new Error('Romantik paket bulunamadı');
        // İlişkiye özel model: ürün "consumable"; kalıcı entitlement beklenmez.
        // Satın alma işlemi hatasız tamamlandıysa BAŞARILI say. Aktivasyon
        // (hangi ilişki için) AppContext.activateRomanticForFriend ile yapılır.
        await Purchases.purchasePackage(pkg);
        return { success: true };
      } else {
        // MOCK: 800ms gecikmeli simülasyon
        await new Promise((r) => setTimeout(r, 800));
        await AsyncStorage.setItem(PREMIUM_KEY, 'true');
        setHasRomantic(true);
        return { success: true };
      }
    } catch (e) {
      // Kullanıcı iptal ettiyse hata fırlatma
      if (e?.userCancelled) return { success: false, cancelled: true };
      console.error('Purchase failed:', e);
      return { success: false, error: e.message || 'Satın alma başarısız' };
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, offerings]);

  /**
   * "Satın alımı geri yükle" - Apple zorunlu kılıyor.
   */
  const restorePurchases = useCallback(async () => {
    try {
      if (USE_REVENUECAT && Purchases) {
        const customerInfo = await Purchases.restorePurchases();
        const isActive = !!customerInfo.entitlements.active[ROMANTIC_ENTITLEMENT];
        setHasRomantic(isActive);
        return { success: isActive };
      } else {
        // MOCK: AsyncStorage'dan tekrar oku
        const v = await AsyncStorage.getItem(PREMIUM_KEY);
        const has = v === 'true';
        setHasRomantic(has);
        return { success: has };
      }
    } catch (e) {
      console.error('Restore failed:', e);
      return { success: false, error: e.message };
    }
  }, []);

  // DEV YALNIZCA: mock satın alımı sıfırlama (test için)
  const resetMockPremium = useCallback(async () => {
    if (USE_REVENUECAT) return;
    await AsyncStorage.removeItem(PREMIUM_KEY);
    setHasRomantic(false);
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        hasRomantic,
        loading,
        purchasing,
        offerings,
        purchaseRomantic,
        restorePurchases,
        resetMockPremium,
        isMock: !USE_REVENUECAT,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
};
