// src/services/notifications.js
//
// Push bildirim kaydı. Kullanıcı giriş yapınca çağrılır:
// izin ister, Expo push token'ı alır ve Firestore'daki users/{uid} dokümanına
// pushTokens dizisine ekler. Cloud Functions bu token'a bildirim gönderir.
//
// Not: Arka planda telefona bildirim düşmesi için Cloud Functions (Blaze plan)
// ve iOS'ta APNs anahtarı gerekir. Bu dosya yalnızca istemci (token) tarafıdır.

import { Platform } from 'react-native';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';

let Notifications = null;
let Device = null;
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (e) {
  // Native modül yok (Expo Go eski sürüm) — sessizce geç.
}

const EAS_PROJECT_ID = '81fc144f-f955-471b-9b71-42208a22f9c1';

// Uygulama açıkken de bildirim gösterilsin.
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * İzin ister, push token alır ve Firestore'a kaydeder.
 * @param {string} uid
 */
export async function registerPushToken(uid) {
  if (!Notifications || !uid) return null;
  try {
    // iOS için bildirim kanalı gerekmez; Android için varsayılan kanal.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const isPhysical = Device ? Device.isDevice : true;
    if (!isPhysical) return null; // Simülatörde push token alınamaz.

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    const token = tokenResp?.data;
    if (!token) return null;

    // users/{uid}.pushTokens dizisine ekle (varsa merge).
    await setDoc(
      doc(db, 'users', uid),
      { pushTokens: arrayUnion(token), platform: Platform.OS },
      { merge: true }
    );
    return token;
  } catch (e) {
    console.warn('registerPushToken failed', e);
    return null;
  }
}
