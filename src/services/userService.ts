import {
  doc, setDoc, getDoc, updateDoc, collection,
  query, where, getDocs, onSnapshot, increment, Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User } from '../types';

function uid() {
  const u = auth.currentUser;
  if (!u) throw new Error('Giriş yapılmamış');
  return u.uid;
}

export async function createUserDoc(
  userId: string,
  data: { email: string; displayName: string; username: string },
) {
  await setDoc(doc(db, 'users', userId), {
    uid:         userId,
    displayName: data.displayName,
    username:    data.username.toLowerCase(),
    email:       data.email,
    avatarUrl:   '',
    createdAt:   Timestamp.now(),
    stats: { totalWon: 0, totalPassed: 0, totalFriends: 0 },
    fcmToken:    '',
  });
}

export function watchUser(userId: string, cb: (user: User | null) => void) {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    const d = snap.data();
    cb({
      uid:         snap.id,
      displayName: d.displayName,
      username:    d.username,
      email:       d.email,
      avatarUrl:   d.avatarUrl,
      createdAt:   d.createdAt.toDate(),
      stats:       d.stats,
      fcmToken:    d.fcmToken,
    });
  });
}

export async function updateProfile(updates: { displayName?: string; avatarUrl?: string }) {
  await updateDoc(doc(db, 'users', uid()), updates);
}

export async function updateFcmToken(token: string) {
  await updateDoc(doc(db, 'users', uid()), { fcmToken: token });
}

export async function searchByUsername(username: string): Promise<User | null> {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username.toLowerCase().trim()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return {
    uid:         snap.docs[0].id,
    displayName: d.displayName,
    username:    d.username,
    email:       d.email,
    avatarUrl:   d.avatarUrl,
    createdAt:   d.createdAt.toDate(),
    stats:       d.stats,
  };
}

export async function incrementStats(
  userId: string,
  field: 'totalWon' | 'totalPassed' | 'totalFriends',
  amount = 1,
) {
  await updateDoc(doc(db, 'users', userId), {
    [`stats.${field}`]: increment(amount),
  });
}
