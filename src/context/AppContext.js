// src/context/AppContext.js
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  writeUserAndUsername,
  checkUsernameAvailable,
  validateUsername,
  createCheque,
  updateChequeReason,
  markChequeUsed,
} from '../services/firebase-service';

const AppContext = createContext(null);

const STORAGE_KEY = '@chequepass_state_v1';

const AVATAR_POOL = ['fox', 'panda', 'koala', 'bunny', 'cat', 'owl'];
const randomAvatar = () => AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

const seedState = () => ({
  user: null,
  isOnboarded: false,
  freePassUsed: false,
  activeFriendId: null,
  friends: [],            // Firestore'dan gelir
  friendRequests: [],     // Firestore'dan gelir
  cheques: [],            // Firestore'dan gelir (Adım 3)
  notifications: [],
  achievements: [
    { id: 'first_cheque', title: 'İlk Çek', description: 'İlk çekini kopardın', unlocked: false },
    { id: 'first_gift', title: 'Cömert Ruh', description: 'Bir çeki hediye ettin', unlocked: false },
    { id: 'first_pass', title: 'Strateji Ustası', description: 'İlk pas hakkını kullandın', unlocked: false },
    { id: 'five_cheques', title: 'Koleksiyoncu', description: '5 çek topladın', unlocked: false },
    { id: 'first_friend', title: 'Sosyal Kelebek', description: 'İlk arkadaşını ekledin', unlocked: false },
  ],
  chequeTemplates: [
    { title: 'Akşam Yemeği', subtitle: 'Romantik bir akşam yemeği hakkı', color: '#add7c4' },
    { title: 'Kahve Ismarlama', subtitle: 'Favori kafende bir kahve', color: '#ebf381' },
    { title: 'Film Seçme Hakkı', subtitle: 'Bu akşam film sen seçiyorsun', color: '#fbcfe8' },
    { title: 'Tatlı Ikramı', subtitle: 'Canının istediği tatlı senin', color: '#fde68a' },
    { title: '1 Saat Masaj', subtitle: 'Sıfır itiraz hakkı', color: '#c7d2fe' },
    { title: 'Bulaşık Muafiyeti', subtitle: 'Bugün bulaşık senin değil', color: '#bae6fd' },
    { title: 'Müzik Seçimi', subtitle: 'Arabanın playlisti sende', color: '#fecaca' },
    { title: 'Sürpriz Hediye', subtitle: 'Küçük bir sürpriz bekle', color: '#ddd6fe' },
    { title: 'Kahvaltı Servisi', subtitle: 'Yatakta kahvaltı hakkı', color: '#bbf7d0' },
    { title: 'Spa Günü', subtitle: 'Evde spa günü planla', color: '#fed7aa' },
  ],
});

// Firestore Timestamp → millis (client'ta henüz yazılmamışken null olabilir)
const tsToMillis = (ts) => {
  if (!ts) return Date.now();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'number') return ts;
  return Date.now();
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(seedState());
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // ---- Load local state from AsyncStorage (user, friends, friendRequests, cheques HARİÇ) ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const { user, friends, friendRequests, cheques, ...rest } = parsed;
          setState((prev) => ({ ...prev, ...rest }));
        }
      } catch (e) {
        console.warn('Hydrate failed', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ---- Firebase Auth dinleyicisi ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.emailVerified) {
          console.log('Email not verified, signing out');
          await fbSignOut(auth);
          setState((prev) => ({ ...prev, user: null }));
          setAuthReady(true);
          return;
        }

        try {
          const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileSnap.exists()) {
            const profile = profileSnap.data();
            setState((prev) => ({
              ...prev,
              user: {
                uid: currentUser.uid,
                email: currentUser.email,
                emailVerified: currentUser.emailVerified,
                username: profile.username,
                avatar: profile.avatar,
                createdAt: profile.createdAt,
              },
            }));
          } else {
            console.warn('User has no Firestore profile, signing out');
            await fbSignOut(auth);
            setState((prev) => ({ ...prev, user: null }));
          }
        } catch (err) {
          console.error('Profile fetch failed', err);
          setState((prev) => ({ ...prev, user: null }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          user: null,
          friends: [],
          friendRequests: [],
          cheques: [],
        }));
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // ---- Friendships real-time dinleyicisi ----
  useEffect(() => {
    if (!state.user?.uid) return;

    const uid = state.user.uid;
    const q = query(
      collection(db, 'friendships'),
      where('userIds', 'array-contains', uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const allRelations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const accepted = allRelations
          .filter((r) => r.status === 'accepted')
          .map((r) => {
            const otherUid = r.userIds.find((id) => id !== uid);
            const otherInfo = r.users?.[otherUid] || {};
            return {
              id: r.id,
              otherUid,
              username: otherInfo.username || 'bilinmeyen',
              avatar: otherInfo.avatar || null,
              relation: otherInfo.relation || 'friend',
              since: r.acceptedAt || r.createdAt,
            };
          });

        const requests = allRelations
          .filter((r) => r.status === 'pending' && r.requestedBy !== uid)
          .map((r) => {
            const otherUid = r.userIds.find((id) => id !== uid);
            const otherInfo = r.users?.[otherUid] || {};
            return {
              id: r.id,
              fromUid: otherUid,
              fromUsername: otherInfo.username || 'bilinmeyen',
              fromAvatar: otherInfo.avatar || null,
              relation: otherInfo.relation || 'friend',
              createdAt: r.createdAt,
            };
          });

        setState((prev) => {
          const achievements = prev.achievements.map((a) =>
            a.id === 'first_friend' && accepted.length > 0 ? { ...a, unlocked: true } : a
          );

          // Gelen istekleri bildirim olarak yaz (duplicate'i önle)
          let notifications = prev.notifications;
          requests.forEach((req) => {
            const notifId = `n_req_${req.id}`;
            if (!notifications.some((n) => n.id === notifId)) {
              notifications = [
                {
                  id: notifId,
                  title: 'Arkadaşlık isteği',
                  body: `@${req.fromUsername} seninle eşleşmek istiyor`,
                  createdAt: req.createdAt?.toMillis?.() || Date.now(),
                  read: false,
                  type: 'friend_request',
                  payload: { friendshipId: req.id },
                },
                ...notifications,
              ];
            }
          });

          // Artık gelmeyen (kabul/red edilmiş) istek bildirimlerini temizle
          const activeRequestIds = new Set(requests.map((r) => `n_req_${r.id}`));
          notifications = notifications.filter((n) => {
            if (n.type !== 'friend_request') return true;
            return activeRequestIds.has(n.id);
          });

          // Aktif arkadaş hâlâ listede yoksa ilk arkadaşa geç
          let activeFriendId = prev.activeFriendId;
          if (activeFriendId && !accepted.some((f) => f.id === activeFriendId)) {
            activeFriendId = accepted.length > 0 ? accepted[0].id : null;
          } else if (!activeFriendId && accepted.length > 0) {
            activeFriendId = accepted[0].id;
          }

          return {
            ...prev,
            friends: accepted,
            friendRequests: requests,
            achievements,
            notifications,
            activeFriendId,
          };
        });
      },
      (error) => {
        console.error('Friendships listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [state.user?.uid]);

  // ---- Cheques real-time dinleyicisi (ADIM 3 YENİ) ----
  useEffect(() => {
    if (!state.user?.uid) return;

    const uid = state.user.uid;
    const q = query(
      collection(db, 'cheques'),
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );

    let isFirstLoad = true;

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const cheques = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAtMillis: tsToMillis(data.createdAt),
            usedAtMillis: data.usedAt ? tsToMillis(data.usedAt) : null,
          };
        });

        // Yeni gelen çekleri bildirim olarak düşür (ilk yüklemede atla)
        setState((prev) => {
          let notifications = prev.notifications;

          if (!isFirstLoad) {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                const id = change.doc.id;
                const notifId = `n_cheque_${id}`;
                if (notifications.some((n) => n.id === notifId)) return;

                // Sadece karşı tarafın yazdığı yeni çekler için bildirim
                // (kendi yazdığımı zaten biliyorum, ama yine de "gönderildi" notu verelim)
                const isIncoming = data.ownerId === uid && data.fromId !== uid;
                const isOutgoingGift = data.ownerId !== uid && data.fromId === uid;

                if (isIncoming) {
                  notifications = [
                    {
                      id: notifId,
                      title: 'Yeni çek kazandın',
                      body: `"${data.title}" çekini kazandın!`,
                      createdAt: Date.now(),
                      read: false,
                      type: 'keep',
                    },
                    ...notifications,
                  ];
                } else if (isOutgoingGift) {
                  notifications = [
                    {
                      id: notifId,
                      title: 'Hediye gönderildi',
                      body: `"${data.title}" çekini hediye ettin.`,
                      createdAt: Date.now(),
                      read: false,
                      type: 'gift',
                    },
                    ...notifications,
                  ];
                }
              }
            });
          }

          // Başarıları otomatik güncelle
          const totalCheques = cheques.length;
          const myGifts = cheques.filter((c) => c.fromId === uid && c.ownerId !== uid).length;
          const achievements = prev.achievements.map((a) => {
            if (a.id === 'first_cheque' && totalCheques > 0) return { ...a, unlocked: true };
            if (a.id === 'first_gift' && myGifts > 0) return { ...a, unlocked: true };
            if (a.id === 'five_cheques' && totalCheques >= 5) return { ...a, unlocked: true };
            return a;
          });

          return {
            ...prev,
            cheques,
            achievements,
            notifications,
          };
        });

        isFirstLoad = false;
      },
      (error) => {
        console.error('Cheques listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [state.user?.uid]);

  // ---- Persist (user, friends, friendRequests, cheques HARİÇ) ----
  useEffect(() => {
    if (!hydrated) return;
    const { user, friends, friendRequests, cheques, ...rest } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)).catch(() => {});
  }, [state, hydrated]);

  // ---- Auth actions -------------------------------------------------

  const signUp = useCallback(async ({ username, email, password }) => {
    const validation = validateUsername(username);
    if (!validation.valid) throw new Error(validation.error);
    const cleanUsername = validation.value;

    const available = await checkUsernameAvailable(cleanUsername);
    if (!available) throw new Error('Bu kullanıcı adı zaten alınmış');

    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    const createdUser = credential.user;

    await createdUser.getIdToken(true);

    try {
      await sendEmailVerification(createdUser);
    } catch (verifyErr) {
      console.warn('Verification email failed (continuing):', verifyErr);
    }

    try {
      await writeUserAndUsername({
        uid: createdUser.uid,
        username: cleanUsername,
        email: email.trim().toLowerCase(),
        avatar: randomAvatar(),
      });
    } catch (err) {
      console.error('Firestore write failed, deleting auth user:', err);
      try {
        await deleteUser(createdUser);
      } catch (cleanupErr) {
        console.warn('Auth cleanup also failed:', cleanupErr);
      }
      throw err;
    }

    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Post-signup sign out failed:', e);
    }

    return createdUser;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!email || !password) throw new Error('E-posta ve şifre gerekli');
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out failed', e);
    }
    setState(seedState());
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!email) throw new Error('E-posta gerekli');
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }, []);

  // ---- Friendship actions ------------------------------------------

  const acceptFriendRequest = useCallback(async (friendshipId) => {
    try {
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Accept failed:', e);
      throw new Error('Kabul edilemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  const rejectFriendRequest = useCallback(async (friendshipId) => {
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
    } catch (e) {
      console.error('Reject failed:', e);
      throw new Error('Reddedilemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  const removeFriend = useCallback(async (friendshipId) => {
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
    } catch (e) {
      console.error('Remove friend failed:', e);
      throw new Error('Silinemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  // ---- Cheque actions (ADIM 3 YENİ - async) -------------------------

  const setOnboarded = useCallback(() => {
    setState((prev) => ({ ...prev, isOnboarded: true }));
  }, []);

  const setActiveFriend = useCallback((friendId) => {
    setState((prev) => ({ ...prev, activeFriendId: friendId }));
  }, []);

  /**
   * Swipe sonrası çağrılır. Pas Firestore'a YAZILMAZ, sadece local state değişir.
   * Keep/Gift Firestore'a yazılır.
   */
  const resolveCheque = useCallback(
    async (template, direction, note = '') => {
      const currentUser = state.user;
      const activeFriendId = state.activeFriendId;
      const activeFriend = state.friends.find((f) => f.id === activeFriendId);

      if (!currentUser || !activeFriend) {
        throw new Error('Aktif kullanıcı veya arkadaş bulunamadı');
      }

      // --- PAS ---
      if (direction === 'pass') {
        setState((prev) => ({
          ...prev,
          freePassUsed: true,
          achievements: prev.achievements.map((a) =>
            a.id === 'first_pass' ? { ...a, unlocked: true } : a
          ),
          notifications: [
            {
              id: 'n_' + Date.now(),
              title: 'Pas geçildi',
              body: `"${template.title}" çeki pas geçildi.`,
              createdAt: Date.now(),
              read: false,
              type: 'pass',
            },
            ...prev.notifications,
          ],
        }));
        return;
      }

      // --- KEEP / GIFT → Firestore ---
      const otherUid = activeFriend.otherUid;
      const ownerId = direction === 'keep' ? currentUser.uid : otherUid;
      const fromId = direction === 'keep' ? otherUid : currentUser.uid;
      const toId = ownerId;

      await createCheque({
        template,
        friendshipId: activeFriendId,
        ownerId,
        fromId,
        toId,
        direction,
        reason: note || '',
        participants: [currentUser.uid, otherUid],
      });
      // Listener otomatik güncelleyecek (notification + achievements dahil)
    },
    [state.user, state.activeFriendId, state.friends]
  );

  const updateChequeNote = useCallback(async (chequeId, note) => {
    try {
      await updateChequeReason(chequeId, note);
    } catch (e) {
      console.error('Update note failed:', e);
      throw new Error('Not güncellenemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  const useChequeCard = useCallback(async (chequeId) => {
    try {
      await markChequeUsed(chequeId);
    } catch (e) {
      console.error('Mark used failed:', e);
      throw new Error('Çek kullanılamadı: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const grantExtraPass = useCallback(() => {
    setState((prev) => ({ ...prev, freePassUsed: false }));
  }, []);

  const setAvatar = useCallback((avatarKey) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, avatar: avatarKey } : prev.user,
    }));
  }, []);

  // ---- Computed ----------------------------------------------------

  const activeFriend = useMemo(
    () => state.friends.find((f) => f.id === state.activeFriendId) || null,
    [state.friends, state.activeFriendId]
  );

  const chequesForActiveFriend = useMemo(() => {
    if (!state.activeFriendId || !activeFriend) return { mine: [], theirs: [] };
    const myUid = state.user?.uid;
    const friendshipId = state.activeFriendId;

    const relevant = state.cheques.filter((c) => c.friendshipId === friendshipId);
    const mine = relevant
      .filter((c) => c.ownerId === myUid)
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
    const theirs = relevant
      .filter((c) => c.ownerId !== myUid)
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
    return { mine, theirs };
  }, [state.cheques, state.activeFriendId, state.user, activeFriend]);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      authReady,
      activeFriend,
      chequesForActiveFriend,
      unreadCount,
      signUp,
      signIn,
      signOut,
      resetPassword,
      setOnboarded,
      setActiveFriend,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      resolveCheque,
      updateChequeNote,
      useChequeCard,
      markAllNotificationsRead,
      grantExtraPass,
      setAvatar,
    }),
    [
      state,
      hydrated,
      authReady,
      activeFriend,
      chequesForActiveFriend,
      unreadCount,
      signUp,
      signIn,
      signOut,
      resetPassword,
      setOnboarded,
      setActiveFriend,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      resolveCheque,
      updateChequeNote,
      useChequeCard,
      markAllNotificationsRead,
      grantExtraPass,
      setAvatar,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};