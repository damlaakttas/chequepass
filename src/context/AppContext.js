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
  friends: [],            // artık Firestore'dan gelecek, seed boş
  friendRequests: [],     // gelen istekler
  cheques: [],            // hâlâ local - sonraki adımda Firestore'a taşıyacağız
  notifications: [],      // hâlâ local
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

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(seedState());
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // ---- Load local state from AsyncStorage (user HARİÇ) ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // user, friends, friendRequests Firebase'den geliyor - storage'dan çıkar
          const { user, friends, friendRequests, ...rest } = parsed;
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
        setState((prev) => ({ ...prev, user: null, friends: [], friendRequests: [] }));
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // ---- Friendships dinleyicisi (kullanıcı giriş yaptığında başlar) ----
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

        // Kabul edilmiş arkadaşlar
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

        // Gelen istekler (başkası göndermiş, ben kabul etmemişim)
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
          // İlk arkadaş eklenmişse başarı rozeti kazan
          const achievements = prev.achievements.map((a) =>
            a.id === 'first_friend' && accepted.length > 0 ? { ...a, unlocked: true } : a
          );

          // Yeni gelen istekleri bildirim olarak ekle (duplicate'i önle)
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

          return {
            ...prev,
            friends: accepted,
            friendRequests: requests,
            achievements,
            notifications,
            activeFriendId:
              prev.activeFriendId ||
              (accepted.length > 0 ? accepted[0].id : null),
          };
        });
      },
      (error) => {
        console.error('Friendships listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [state.user?.uid]);

  // ---- Persist (user, friends, friendRequests HARİÇ) ----
  useEffect(() => {
    if (!hydrated) return;
    const { user, friends, friendRequests, ...rest } = state;
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

  // ---- Local state actions (sonraki adımlarda Firestore'a taşınacak) ----

  const setOnboarded = useCallback(() => {
    setState((prev) => ({ ...prev, isOnboarded: true }));
  }, []);

  const setActiveFriend = useCallback((friendId) => {
    setState((prev) => ({ ...prev, activeFriendId: friendId }));
  }, []);

  const resolveCheque = useCallback((template, direction, note = '') => {
    setState((prev) => {
      if (!prev.user || !prev.activeFriendId) return prev;

      if (direction === 'pass') {
        const achievements = prev.achievements.map((a) =>
          a.id === 'first_pass' ? { ...a, unlocked: true } : a
        );
        return {
          ...prev,
          freePassUsed: true,
          achievements,
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
        };
      }

      const id = 'c_' + Date.now();
      const ownerId = direction === 'keep' ? prev.user.uid : prev.activeFriendId;
      const fromId = direction === 'keep' ? prev.activeFriendId : prev.user.uid;
      const toId = ownerId;

      const cheque = {
        id,
        title: template.title,
        subtitle: template.subtitle,
        color: template.color,
        reason: note || '',
        ownerId,
        fromId,
        toId,
        friendId: prev.activeFriendId,
        direction,
        createdAt: Date.now(),
        status: 'active',
      };

      const newCheques = [cheque, ...prev.cheques];

      const achievements = prev.achievements.map((a) => {
        if (a.id === 'first_cheque') return { ...a, unlocked: true };
        if (a.id === 'first_gift' && direction === 'gift') return { ...a, unlocked: true };
        if (a.id === 'five_cheques' && newCheques.length >= 5) return { ...a, unlocked: true };
        return a;
      });

      const notification = {
        id: 'n_' + Date.now(),
        title: direction === 'gift' ? 'Hediye gönderildi' : 'Yeni çek kazandın',
        body:
          direction === 'gift'
            ? `"${template.title}" çekini hediye ettin.`
            : `"${template.title}" çekini kazandın!`,
        createdAt: Date.now(),
        read: false,
        type: direction,
      };

      return {
        ...prev,
        cheques: newCheques,
        achievements,
        notifications: [notification, ...prev.notifications],
      };
    });
  }, []);

  const updateChequeNote = useCallback((chequeId, note) => {
    setState((prev) => ({
      ...prev,
      cheques: prev.cheques.map((c) => (c.id === chequeId ? { ...c, reason: note } : c)),
    }));
  }, []);

  const useChequeCard = useCallback((chequeId) => {
    setState((prev) => ({
      ...prev,
      cheques: prev.cheques.map((c) =>
        c.id === chequeId ? { ...c, status: 'used', usedAt: Date.now() } : c
      ),
    }));
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
    const otherUid = activeFriend.otherUid;
    const mine = state.cheques
      .filter((c) => {
        const matchesFriend = c.friendId === state.activeFriendId || c.friendId === otherUid;
        return matchesFriend && c.ownerId === state.user?.uid;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    const theirs = state.cheques
      .filter((c) => {
        const matchesFriend = c.friendId === state.activeFriendId || c.friendId === otherUid;
        return matchesFriend && c.ownerId !== state.user?.uid;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
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