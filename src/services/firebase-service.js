// src/services/firebase-service.js
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ---- Username validation ----------------------------------------------------

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

// ---- User profile helpers ---------------------------------------------------

export const writeUserAndUsername = async ({ uid, username, email, avatar }) => {
  const usernameLower = username.toLowerCase();
  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', usernameLower);

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

  try {
    await setDoc(usernameRef, {
      uid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Username doc write failed:', e.code, e.message);
    try {
      await deleteDoc(userRef);
    } catch (cleanupErr) {
      console.warn('User doc cleanup failed:', cleanupErr);
    }
    throw new Error('Kullanıcı adı kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
  }
};

export const findUserByUsername = async (username) => {
  const usernameLower = username.toLowerCase();
  const unameSnap = await getDoc(doc(db, 'usernames', usernameLower));
  if (!unameSnap.exists()) return null;

  const { uid } = unameSnap.data();
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;

  return { uid, ...userSnap.data() };
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

// ---- Friendship helpers -----------------------------------------------------

const friendshipId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Arkadaşlık isteği gönder.
 */
export const sendFriendRequest = async ({ sender, targetUsername, relation = 'friend' }) => {
  const cleanTarget = targetUsername.trim().toLowerCase();

  if (sender.username.toLowerCase() === cleanTarget) {
    throw new Error('Kendini ekleyemezsin');
  }

  const targetUser = await findUserByUsername(cleanTarget);
  if (!targetUser) {
    throw new Error('Bu kullanıcı adıyla kimse bulunamadı');
  }

  const fId = friendshipId(sender.uid, targetUser.uid);
  const existing = await getDoc(doc(db, 'friendships', fId));
  if (existing.exists()) {
    const data = existing.data();
    if (data.status === 'accepted') {
      throw new Error('Bu kullanıcıyla zaten arkadaşsınız');
    }
    if (data.status === 'pending') {
      if (data.requestedBy === sender.uid) {
        throw new Error('Bu kullanıcıya zaten istek gönderdin');
      } else {
        throw new Error('Bu kullanıcı sana istek göndermiş, bildirimlerini kontrol et');
      }
    }
    if (data.status === 'blocked') {
      throw new Error('Bu kullanıcıyla ilişki kurulamaz');
    }
  }

  await setDoc(doc(db, 'friendships', fId), {
    userIds: [sender.uid, targetUser.uid],
    users: {
      [sender.uid]: {
        username: sender.username,
        avatar: sender.avatar || null,
        relation,
      },
      [targetUser.uid]: {
        username: targetUser.username,
        avatar: targetUser.avatar || null,
        relation,
      },
    },
    status: 'pending',
    requestedBy: sender.uid,
    createdAt: serverTimestamp(),
  });

  return { friendshipId: fId, targetUsername: targetUser.username };
};