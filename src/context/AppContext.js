// src/context/AppContext.js
//
// MIMARİ NOTLAR:
// - Bildirimler artık state'te tutulmuyor; doğrudan cheques + friendRequests + local pass'lerden TÜRETİLİYOR.
//   Bu sayede logout-login sonrası bildirimler kaybolmaz, zamanlar gerçek (Firestore createdAt'ten gelir).
// - "Okundu" durumu ayrı bir AsyncStorage map'inde tutulur (`@chequepass_read_v1`).
// - Pas geçme olayları local olarak `@chequepass_pass_events_v1` listesinde tutulur (max 50, en yeni en üstte).
// - `isOnboarded` ayrı key'de tutulur ki signOut sonrası kaybolmasın.
// - `freePassUsed` ve `lastPassResetAt` ile günde 1 ücretsiz pas mantığı.

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  writeUserAndUsername,
  checkUsernameAvailable,
  validateUsername,
  createCheque,
  updateChequeReason,
  markChequeUsed,
  updateUserAvatar,
  deleteCheque,
} from '../services/firebase-service';

const AppContext = createContext(null);

const STORAGE_KEY = '@chequepass_state_v1';
const ONBOARDED_KEY = '@chequepass_onboarded_v1';
const READ_KEY = '@chequepass_read_v1';            // { [notifId]: true }
const PASS_EVENTS_KEY = '@chequepass_pass_events_v1'; // [{ id, title, ts }]
const LAST_PASS_RESET_KEY = '@chequepass_last_pass_reset_v1';

const PASS_EVENTS_MAX = 50;
const PASS_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 saat

const AVATAR_POOL = ['fox', 'panda', 'koala', 'bunny', 'cat', 'owl'];
const randomAvatar = () => AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

const seedState = () => ({
  user: null,
  isOnboarded: false,
  freePassUsed: false,
  activeFriendId: null,
  friends: [],
  friendRequests: [],
  cheques: [],
  passEvents: [],            // local pas geçmişi
  readMap: {},               // { [notifId]: true }
  achievements: [
    { id: 'first_cheque', title: 'İlk Çek', description: 'İlk çekini kopardın', unlocked: false },
    { id: 'first_gift', title: 'Cömert Ruh', description: 'Bir çeki hediye ettin', unlocked: false },
    { id: 'first_pass', title: 'Strateji Ustası', description: 'İlk pas hakkını kullandın', unlocked: false },
    { id: 'five_cheques', title: 'Koleksiyoncu', description: '5 çek topladın', unlocked: false },
    { id: 'first_friend', title: 'Sosyal Kelebek', description: 'İlk arkadaşını ekledin', unlocked: false },
  ],
  // Kart desteleri Firestore'dan gelir; boş başlar.
  // decks.friend, decks.partner, decks.romantic
  decks: { friend: [], partner: [], romantic: [] },
  decksLoaded: false,
  // Aktif arkadaş için kullanıcının seçtiği deste varyantı.
  // Sevgili ilişkide: 'partner' veya 'romantic' (premium varsa)
  // Arkadaş ilişkide: 'friend' veya 'romantic' (premium varsa)
  // Default: ilişki türüne göre belirlenir.
  selectedDeckVariant: null, // 'normal' | 'romantic'
});

// Firestore Timestamp → millis
const tsToMillis = (ts) => {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'number') return ts;
  if (ts.seconds) return ts.seconds * 1000;
  return null;
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(seedState());
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const signupInProgressRef = useRef(false);

  // ---- Hydrate ----
  useEffect(() => {
    (async () => {
      try {
        const [raw, onboardedRaw, readRaw, passRaw, lastResetRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ONBOARDED_KEY),
          AsyncStorage.getItem(READ_KEY),
          AsyncStorage.getItem(PASS_EVENTS_KEY),
          AsyncStorage.getItem(LAST_PASS_RESET_KEY),
        ]);

        const isOnboarded = onboardedRaw === 'true';
        let readMap = {};
        try { readMap = readRaw ? JSON.parse(readRaw) : {}; } catch (e) { readMap = {}; }
        let passEvents = [];
        try { passEvents = passRaw ? JSON.parse(passRaw) : []; } catch (e) { passEvents = []; }

        // Pas yenileme: 24 saat geçmiş mi?
        let freePassUsed = false;
        if (lastResetRaw) {
          const lastReset = parseInt(lastResetRaw, 10);
          if (!isNaN(lastReset) && Date.now() - lastReset < PASS_RESET_INTERVAL_MS) {
            // 24 saat dolmamış → eski state'ten freePassUsed'i koru
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                freePassUsed = !!parsed.freePassUsed;
              } catch (e) {}
            }
          }
        }

        if (raw) {
          const parsed = JSON.parse(raw);
          const { user, friends, friendRequests, cheques, notifications, ...rest } = parsed;
          setState((prev) => ({
            ...prev,
            ...rest,
            isOnboarded,
            freePassUsed,
            readMap,
            passEvents,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isOnboarded,
            freePassUsed,
            readMap,
            passEvents,
          }));
        }
      } catch (e) {
        console.warn('Hydrate failed', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ---- Persist (sadece UI tercihleri; user/friends/cheques HARİÇ) ----
  useEffect(() => {
    if (!hydrated) return;
    const {
      user,
      friends,
      friendRequests,
      cheques,
      passEvents,
      readMap,
      isOnboarded,
      ...rest
    } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)).catch(() => {});
  }, [state, hydrated]);

  // readMap ve passEvents ayrı persist
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(READ_KEY, JSON.stringify(state.readMap || {})).catch(() => {});
  }, [state.readMap, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(PASS_EVENTS_KEY, JSON.stringify(state.passEvents || [])).catch(() => {});
  }, [state.passEvents, hydrated]);

  // ---- Firebase Auth dinleyicisi ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (signupInProgressRef.current) {
        console.log('Signup in progress, skipping auth state handler');
        return;
      }

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
              acceptedAtMillis: tsToMillis(r.acceptedAt) || tsToMillis(r.createdAt),
              createdAtMillis: tsToMillis(r.createdAt),
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
              createdAtMillis: tsToMillis(r.createdAt),
            };
          });

        setState((prev) => {
          const achievements = prev.achievements.map((a) =>
            a.id === 'first_friend' && accepted.length > 0 ? { ...a, unlocked: true } : a
          );

          // Aktif arkadaş silinmişse / değişmişse koru ya da ilkine geç
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

  // ---- Cheques real-time dinleyicisi ----
  useEffect(() => {
    if (!state.user?.uid) return;

    const uid = state.user.uid;
    const q = query(
      collection(db, 'cheques'),
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const cheques = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAtMillis: tsToMillis(data.createdAt),
            usedAtMillis: tsToMillis(data.usedAt),
          };
        });

        setState((prev) => {
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
          };
        });
      },
      (error) => {
        console.error('Cheques listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [state.user?.uid]);

  // ---- Decks listener (Firestore'dan kart şablonları) ----
  // 3 deste paralel çekilir: friend, partner, romantic.
  useEffect(() => {
    if (!state.user?.uid) return;

    const deckIds = ['friend', 'partner', 'romantic'];
    const unsubscribers = [];
    const tempDecks = { friend: null, partner: null, romantic: null };

    deckIds.forEach((deckId) => {
      const q = query(
        collection(db, 'decks', deckId, 'cards'),
        orderBy('order', 'asc')
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          tempDecks[deckId] = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => c.active !== false);

          // Hepsi yüklendiyse state'e yaz
          if (Object.values(tempDecks).every((d) => d !== null)) {
            setState((prev) => ({
              ...prev,
              decks: { ...tempDecks },
              decksLoaded: true,
            }));
          }
        },
        (error) => {
          console.error(`Decks listener error (${deckId}):`, error);
          // Hata olsa bile yüklendi say (boş)
          tempDecks[deckId] = [];
          if (Object.values(tempDecks).every((d) => d !== null)) {
            setState((prev) => ({
              ...prev,
              decks: { ...tempDecks },
              decksLoaded: true,
            }));
          }
        }
      );
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u && u());
  }, [state.user?.uid]);

  const signUp = useCallback(async ({ username, email, password }) => {
    const validation = validateUsername(username);
    if (!validation.valid) throw new Error(validation.error);
    const cleanUsername = validation.value;

    const available = await checkUsernameAvailable(cleanUsername);
    if (!available) throw new Error('Bu kullanıcı adı zaten alınmış');

    signupInProgressRef.current = true;

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      const createdUser = credential.user;

      await createdUser.getIdToken(true);
      await new Promise((res) => setTimeout(res, 600));

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
    } finally {
      signupInProgressRef.current = false;
    }
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
    setState((prev) => ({
      ...seedState(),
      isOnboarded: prev.isOnboarded,
      readMap: prev.readMap,
      passEvents: prev.passEvents,
      freePassUsed: prev.freePassUsed,
    }));
  }, []);

  /**
   * HESAP SİLME (Apple Guideline 5.1.1(v) gereksinimi).
   *
   * Akış:
   * 1. Şifreyle yeniden doğrulama (Firebase deleteUser "recent login" ister)
   * 2. Firestore verilerini temizle: cheques, friendships, usernames/{username}, users/{uid}
   * 3. Firebase Auth hesabını sil
   * 4. Local state sıfırla (onAuthStateChanged zaten null döner)
   *
   * Firestore silmeleri best-effort DEĞİL: veri temizliği başarısız olursa
   * hata fırlatılır ki kullanıcı tekrar deneyebilsin (Apple, verinin de
   * silinmesini bekler).
   */
  const deleteAccount = useCallback(async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapıp dene.');
    }
    if (!password) throw new Error('Şifre gerekli');

    // 1) Yeniden doğrulama
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } catch (e) {
      if (
        e?.code === 'auth/wrong-password' ||
        e?.code === 'auth/invalid-credential' ||
        e?.code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('Şifre hatalı. Lütfen tekrar dene.');
      }
      if (e?.code === 'auth/too-many-requests') {
        throw new Error('Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.');
      }
      throw new Error('Kimlik doğrulanamadı: ' + (e?.message || 'bilinmeyen hata'));
    }

    const uid = currentUser.uid;

    // 2) Firestore veri temizliği
    const refs = [];

    const [chequesSnap, friendshipsSnap, profileSnap] = await Promise.all([
      getDocs(query(collection(db, 'cheques'), where('participants', 'array-contains', uid))),
      getDocs(query(collection(db, 'friendships'), where('userIds', 'array-contains', uid))),
      getDoc(doc(db, 'users', uid)),
    ]);

    chequesSnap.docs.forEach((d) => refs.push(d.ref));
    friendshipsSnap.docs.forEach((d) => refs.push(d.ref));

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      const usernameLower =
        data.usernameLower || (data.username ? String(data.username).toLowerCase() : null);
      if (usernameLower) refs.push(doc(db, 'usernames', usernameLower));
    }
    refs.push(doc(db, 'users', uid));

    // Batch limiti 500; güvenli olsun diye 450'lik parçalara böl
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach((r) => batch.delete(r));
      await batch.commit();
    }

    // 3) Auth hesabını sil
    await deleteUser(currentUser);

    // 4) Local temizlik (auth listener da tetiklenir)
    try {
      await AsyncStorage.multiRemove([READ_KEY, PASS_EVENTS_KEY, LAST_PASS_RESET_KEY]);
    } catch (e) {}
    setState((prev) => ({ ...seedState(), isOnboarded: prev.isOnboarded }));
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

  /**
   * İlişki türünü değiştir (çift taraflı). Bir taraf değiştirirse
   * her iki kullanıcı için aynı şekilde güncellenir.
   * relation: 'partner' | 'friend'
   */
  const updateFriendRelation = useCallback(async (friendshipId, newRelation) => {
    try {
      const ref = doc(db, 'friendships', friendshipId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('İlişki bulunamadı');
      const data = snap.data();
      const updatedUsers = { ...(data.users || {}) };
      Object.keys(updatedUsers).forEach((uid) => {
        updatedUsers[uid] = { ...updatedUsers[uid], relation: newRelation };
      });
      await updateDoc(ref, { users: updatedUsers });
    } catch (e) {
      console.error('Update relation failed:', e);
      throw new Error('İlişki türü güncellenemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  // ---- Local actions -----------------------------------------------

  const setOnboarded = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch (e) {
      console.warn('Save onboarded failed', e);
    }
    setState((prev) => ({ ...prev, isOnboarded: true }));
  }, []);

  const setActiveFriend = useCallback((friendId) => {
    setState((prev) => ({ ...prev, activeFriendId: friendId, selectedDeckVariant: null }));
    // Arkadaş değişince seçim sıfırlanır - aktif deste yeniden hesaplanır
  }, []);

  const setSelectedDeckVariant = useCallback((variant) => {
    // 'normal' veya 'romantic'
    setState((prev) => ({ ...prev, selectedDeckVariant: variant }));
  }, []);

  /**
   * Pas / Keep / Gift çözüm.
   * Keep ve Gift Firestore'a yazılır; Pas yalnızca local pas event'i kaydeder.
   */
  const resolveCheque = useCallback(
    async (template, direction, note = '') => {
      const currentUser = state.user;
      const activeFriendId = state.activeFriendId;
      const activeFriend = state.friends.find((f) => f.id === activeFriendId);

      if (!currentUser || !activeFriend) {
        throw new Error('Aktif kullanıcı veya arkadaş bulunamadı');
      }

      if (direction === 'pass') {
        const eventId = 'p_' + Date.now();
        const event = {
          id: eventId,
          title: template.title,
          friendUsername: activeFriend.username,
          ts: Date.now(),
        };

        // Bu pas tüketilen ücretsiz pas mı?
        // freePassUsed zaten true ise bu reklamla kazanılmış paslardır.
        // Burada freePassUsed'i true yap ve son reset zamanını işaretle.
        try {
          await AsyncStorage.setItem(LAST_PASS_RESET_KEY, String(Date.now()));
        } catch (e) {}

        setState((prev) => ({
          ...prev,
          freePassUsed: true,
          passEvents: [event, ...(prev.passEvents || [])].slice(0, PASS_EVENTS_MAX),
          achievements: prev.achievements.map((a) =>
            a.id === 'first_pass' ? { ...a, unlocked: true } : a
          ),
        }));
        return;
      }

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

  /**
   * Kullanılmış çeki sil. Sadece çekin sahibi (status='used' olanı) silebilir.
   * Firestore rules tarafında da kontrol var.
   */
  const deleteChequeCard = useCallback(async (chequeId) => {
    try {
      await deleteCheque(chequeId);
    } catch (e) {
      console.error('Delete cheque failed:', e);
      throw new Error('Çek silinemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }, []);

  // Tek bir bildirimi okundu olarak işaretle (kalıcı)
  const markNotificationRead = useCallback((notifId) => {
    setState((prev) => {
      if (prev.readMap?.[notifId]) return prev;
      return { ...prev, readMap: { ...(prev.readMap || {}), [notifId]: true } };
    });
  }, []);

  const grantExtraPass = useCallback(() => {
    setState((prev) => ({ ...prev, freePassUsed: false }));
  }, []);

  const setAvatar = useCallback(async (avatarKey) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, avatar: avatarKey } : prev.user,
    }));
    if (state.user?.uid) {
      try {
        await updateUserAvatar(state.user.uid, avatarKey);
      } catch (e) {
        console.warn('Avatar Firestore update failed:', e);
      }
    }
  }, [state.user?.uid]);

  // ---- Computed: notifications (TÜRETİLMİŞ) ------------------------
  //
  // BILDIRIM POLITIKASI:
  // - Kendi yaptığım hareketler için BILDIRIM YOK (kendine aldım, hediye gönderdim, pas geçtim).
  // - Sadece KARŞI TARAFIN benimle ilgili eylemleri:
  //   * Arkadaşlık isteği gönderdi (friend_request)
  //   * Bana hediye yolladı (gift_received)
  //   * Sahibi olduğu (benden ona gelen veya kendi aldığı) çeki KULLANDI (cheque_used_by_friend)

  const derivedNotifications = useMemo(() => {
    if (!state.user?.uid) return [];
    const uid = state.user.uid;
    const list = [];

    // 1. Friend requests
    state.friendRequests.forEach((req) => {
      list.push({
        id: `n_req_${req.id}`,
        type: 'friend_request',
        title: 'Arkadaşlık isteği',
        body: `@${req.fromUsername} seninle eşleşmek istiyor`,
        createdAtMillis: req.createdAtMillis || Date.now(),
        payload: { friendshipId: req.id },
      });
    });

    // 2. Cheques
    state.cheques.forEach((c) => {
      const ts = c.createdAtMillis || Date.now();

      // (a) Karşı taraf bana hediye yolladı → bildirim
      // ÖNEMLI: direction='gift' VE ben sahibiyim → bana hediye gelmiş demektir.
      // (Kendine alma 'keep' direction'ında kalır, fromId teknik olarak otherUid olsa
      //  da bildirim oluşturmamak için direction filtresi şart.)
      if (c.direction === 'gift' && c.ownerId === uid && c.fromId !== uid) {
        list.push({
          id: `n_cheque_${c.id}`,
          type: 'gift_received',
          title: 'Yeni çek geldi 🎁',
          body: `"${c.title}" çekini sana hediye etti`,
          createdAtMillis: ts,
          payload: { chequeId: c.id },
        });
      }

      // (b) Karşı taraf, kendi sahibi olduğu çeki KULLANDI → bana haber
      if (c.ownerId !== uid && c.status === 'used' && c.usedAtMillis) {
        list.push({
          id: `n_cheque_used_${c.id}`,
          type: 'cheque_used_by_friend',
          title: 'Çek kullanıldı ✓',
          body: `"${c.title}" çekini karşı taraf kullandı`,
          createdAtMillis: c.usedAtMillis,
          payload: { chequeId: c.id },
        });
      }

      // (c) Kendi yaptığım hareketler için bildirim YOK:
      //     - Kendine aldım (direction='keep', ownerId === uid)
      //     - Hediye gönderdim (direction='gift', ownerId !== uid, fromId === uid)
      //     - Pas geçtim
    });

    // 3. Pas events: artık bildirim üretmiyor (kullanıcı kendi pasını biliyor).

    // En yeni en üstte
    list.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));

    return list.map((n) => ({
      ...n,
      read: !!state.readMap?.[n.id],
    }));
  }, [
    state.user?.uid,
    state.friendRequests,
    state.cheques,
    state.readMap,
  ]);

  // markAllNotificationsRead'i derivedNotifications üzerinden override et
  const markAllNotificationsReadFinal = useCallback(() => {
    setState((prev) => {
      const next = { ...(prev.readMap || {}) };
      derivedNotifications.forEach((n) => {
        if (!n.read) next[n.id] = true;
      });
      return { ...prev, readMap: next };
    });
  }, [derivedNotifications]);

  // ---- Computed -----------------------------------------------------

  const activeFriend = useMemo(
    () => state.friends.find((f) => f.id === state.activeFriendId) || null,
    [state.friends, state.activeFriendId]
  );

  /**
   * Aktif arkadaş ve seçili deste varyantına göre kullanılacak kart array'i.
   * - Sevgili ilişkide:
   *   - Default: 'partner' destesi
   *   - Premium varsa kullanıcı 'romantic' seçebilir
   * - Arkadaş ilişkide:
   *   - Default: 'friend' destesi
   *   - Premium varsa kullanıcı 'romantic' seçebilir
   *
   * Bu hook çıktı, dışarıda { activeDeckCards, availableVariants, currentVariant } şeklinde döner.
   * Premium state PremiumContext'ten ayrı geleceği için burada premium yok varsayımıyla
   * kart döndürür; HomeScreen premium'a göre nihai filtreleme yapar.
   */
  const activeDeckInfo = useMemo(() => {
    if (!activeFriend) return { cards: [], baseVariant: 'friend', currentVariant: 'normal' };

    const isPartner = activeFriend.relation === 'partner';
    const baseVariant = isPartner ? 'partner' : 'friend';
    const currentVariant = state.selectedDeckVariant || 'normal';

    let cards;
    if (currentVariant === 'romantic') {
      cards = state.decks.romantic || [];
    } else {
      cards = state.decks[baseVariant] || [];
    }

    return { cards, baseVariant, currentVariant };
  }, [activeFriend, state.selectedDeckVariant, state.decks]);

  const chequesForActiveFriend = useMemo(() => {
    if (!state.activeFriendId || !activeFriend) return { mine: [], theirs: [] };
    const myUid = state.user?.uid;
    const friendshipId = state.activeFriendId;

    const relevant = state.cheques.filter((c) => c.friendshipId === friendshipId);
    const mine = relevant
      .filter((c) => c.ownerId === myUid)
      .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
    const theirs = relevant
      .filter((c) => c.ownerId !== myUid)
      .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
    return { mine, theirs };
  }, [state.cheques, state.activeFriendId, state.user, activeFriend]);

  const unreadCount = useMemo(
    () => derivedNotifications.filter((n) => !n.read).length,
    [derivedNotifications]
  );

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      authReady,
      activeFriend,
      activeDeckInfo,
      chequesForActiveFriend,
      notifications: derivedNotifications,
      unreadCount,
      signUp,
      signIn,
      signOut,
      deleteAccount,
      resetPassword,
      setOnboarded,
      setActiveFriend,
      setSelectedDeckVariant,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      updateFriendRelation,
      resolveCheque,
      updateChequeNote,
      useChequeCard,
      deleteChequeCard,
      markNotificationRead,
      markAllNotificationsRead: markAllNotificationsReadFinal,
      grantExtraPass,
      setAvatar,
    }),
    [
      state,
      hydrated,
      authReady,
      activeFriend,
      activeDeckInfo,
      chequesForActiveFriend,
      derivedNotifications,
      unreadCount,
      signUp,
      signIn,
      signOut,
      deleteAccount,
      resetPassword,
      setOnboarded,
      setActiveFriend,
      setSelectedDeckVariant,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      updateFriendRelation,
      resolveCheque,
      updateChequeNote,
      useChequeCard,
      deleteChequeCard,
      markNotificationRead,
      markAllNotificationsReadFinal,
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
