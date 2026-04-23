// src/services/firebase-service.js
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Username format kontrolü (3-20 karakter, harf/rakam/alt tire)
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Kullanıcı adı gerekli' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Kullanıcı adı en az 3 karakter olmalı' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Kullanıcı adı en fazla 20 karakter olabilir' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Sadece harf, rakam ve alt tire (_) kullanabilirsin',
    };
  }
  return { valid: true, value: trimmed };
};

// Username müsait mi?
export const checkUsernameAvailable = async (username) => {
  const usernameLower = username.toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'usernames', usernameLower));
    return !snap.exists();
  } catch (e) {
    console.warn('checkUsernameAvailable failed:', e.code, e.message);
    throw new Error('Kullanıcı adı kontrol edilemedi, tekrar dene');
  }
};

/**
 * Signup flow için Firestore dokümanlarını yaz.
 * Transaction KULLANMAZ, iki ayrı setDoc çağırır.
 * Hata olursa yazılmış olanları geri temizler.
 */
export const writeUserAndUsername = async ({
  uid,
  username,
  email,
  avatar,
}) => {
  const usernameLower = username.toLowerCase();
  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', usernameLower);

  // Önce kullanıcı profilini yaz
  try {
    await setDoc(userRef, {
      uid,
      username,
      usernameLower,
      email: email.toLowerCase(),
      avatar,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('User doc write failed:', e.code, e.message);
    throw new Error('Profil kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
  }

  // Sonra username rezervasyonunu yaz
  try {
    await setDoc(usernameRef, {
      uid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Username doc write failed:', e.code, e.message);
    // Kullanıcı dokümanını temizle
    try {
      await deleteDoc(userRef);
    } catch (cleanupErr) {
      console.warn('User doc cleanup failed:', cleanupErr);
    }
    throw new Error('Kullanıcı adı kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
  }
};

// Username'den kullanıcı bul
export const findUserByUsername = async (username) => {
  const usernameLower = username.toLowerCase();
  const unameSnap = await getDoc(doc(db, 'usernames', usernameLower));
  if (!unameSnap.exists()) return null;

  const { uid } = unameSnap.data();
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;

  return { uid, ...userSnap.data() };
};

// UID'den kullanıcı profili getir
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};