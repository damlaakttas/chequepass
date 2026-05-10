import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config - public değerler, doğrudan kod içinde tutuluyor.
// Güvenlik Firebase Authentication + Firestore Rules ile sağlanıyor.
const firebaseConfig = {
  apiKey: 'AIzaSyAWPRDrOSucWCI_Y3cWz5a_aCoAsCA9AoE',
  authDomain: 'chequepass-app-ae4af.firebaseapp.com',
  projectId: 'chequepass-app-ae4af',
  storageBucket: 'chequepass-app-ae4af.firebasestorage.app',
  messagingSenderId: '882532685628',
  appId: '1:882532685628:web:d01907259c602439a1f039',
};

// Firebase'i başlatıyoruz
const app = initializeApp(firebaseConfig);

// Kimlik doğrulama ayarları
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Veri tabanı
export const db = getFirestore(app);