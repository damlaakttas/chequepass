// src/context/AppContext.js
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const STORAGE_KEY = '@chequepass_state_v1';

// ---- Seed data (ilk kurulumda) -----------------------------------------------
const AVATAR_POOL = ['fox', 'panda', 'koala', 'bunny', 'cat', 'owl'];

const randomAvatar = () => AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

const seedState = () => ({
  user: null, // { uid, username, email, avatar, createdAt }
  isOnboarded: false,
  freePassUsed: false,
  activeFriendId: null,
  friends: [], // [{ id, username, relation: 'partner'|'friend', avatar, since }]
  cheques: [], // [{ id, title, reason, ownerId, direction, fromId, toId, note, createdAt, status }]
  notifications: [], // [{ id, title, body, createdAt, read, type }]
  achievements: [
    { id: 'first_cheque', title: 'İlk Çek', description: 'İlk çekini kopardın', unlocked: false },
    { id: 'first_gift', title: 'Cömert Ruh', description: 'Bir çeki hediye ettin', unlocked: false },
    { id: 'first_pass', title: 'Strateji Ustası', description: 'İlk pas hakkını kullandın', unlocked: false },
    { id: 'five_cheques', title: 'Koleksiyoncu', description: '5 çek topladın', unlocked: false },
    { id: 'first_friend', title: 'Sosyal Kelebek', description: 'İlk arkadaşını ekledin', unlocked: false },
  ],
  // Sahte çek havuzu - her kopartmada buradan bir tanesi seçilir
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

// ---- Provider ----------------------------------------------------------------
export const AppProvider = ({ children }) => {
  const [state, setState] = useState(seedState());
  const [hydrated, setHydrated] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn('Hydrate failed', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  // ---- Actions ---------------------------------------------------------------
  const signUp = useCallback(async ({ username, email, password }) => {
    // Mock sign up - gerçek projede Firebase Auth çağrılır
    if (!username || !email || !password) throw new Error('Tüm alanları doldur');
    const user = {
      uid: 'u_' + Date.now(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      avatar: null,
      createdAt: Date.now(),
    };
    // Varsayılan bir demo arkadaş ekle ki uygulama boş kalmasın
    const demoFriend = {
      id: 'f_demo',
      username: 'elif',
      relation: 'partner',
      avatar: randomAvatar(),
      since: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      user,
      friends: [demoFriend],
      activeFriendId: demoFriend.id,
      notifications: [
        {
          id: 'n_welcome',
          title: 'Hoş geldin!',
          body: 'ChequePass dünyasına hoş geldin. İlk çekini koparmaya ne dersin?',
          createdAt: Date.now(),
          read: false,
          type: 'system',
        },
      ],
    }));
    return user;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!email || !password) throw new Error('Email ve şifre gerekli');
    // Mock - zaten kayıtlıysa devam et, değilse otomatik oluştur
    setState((prev) => {
      if (prev.user) return prev;
      const user = {
        uid: 'u_' + Date.now(),
        username: email.split('@')[0],
        email,
        avatar: null,
        createdAt: Date.now(),
      };
      const demoFriend = {
        id: 'f_demo',
        username: 'elif',
        relation: 'partner',
        avatar: randomAvatar(),
        since: Date.now(),
      };
      return {
        ...prev,
        user,
        friends: prev.friends.length ? prev.friends : [demoFriend],
        activeFriendId: prev.activeFriendId || demoFriend.id,
      };
    });
  }, []);

  const signOut = useCallback(() => {
    setState(seedState());
  }, []);

  const setOnboarded = useCallback(() => {
    setState((prev) => ({ ...prev, isOnboarded: true }));
  }, []);

  const setActiveFriend = useCallback((friendId) => {
    setState((prev) => ({ ...prev, activeFriendId: friendId }));
  }, []);

  const addFriend = useCallback((username, relation = 'friend') => {
    if (!username) return;
    setState((prev) => {
      if (prev.friends.some((f) => f.username.toLowerCase() === username.toLowerCase())) {
        return prev; // zaten eklenmiş
      }
      const friend = {
        id: 'f_' + Date.now(),
        username: username.trim(),
        relation,
        avatar: randomAvatar(),
        since: Date.now(),
      };
      const achievements = prev.achievements.map((a) =>
        a.id === 'first_friend' ? { ...a, unlocked: true } : a
      );
      return {
        ...prev,
        friends: [...prev.friends, friend],
        activeFriendId: prev.activeFriendId || friend.id,
        achievements,
        notifications: [
          {
            id: 'n_' + Date.now(),
            title: 'Yeni arkadaş',
            body: `${friend.username} artık arkadaş listende!`,
            createdAt: Date.now(),
            read: false,
            type: 'friend',
          },
          ...prev.notifications,
        ],
      };
    });
  }, []);

  const removeFriend = useCallback((friendId) => {
    setState((prev) => ({
      ...prev,
      friends: prev.friends.filter((f) => f.id !== friendId),
      activeFriendId:
        prev.activeFriendId === friendId
          ? prev.friends.find((f) => f.id !== friendId)?.id || null
          : prev.activeFriendId,
    }));
  }, []);

  // direction: 'gift' (partnere gönder), 'keep' (kendine al), 'pass' (pas geç)
  const resolveCheque = useCallback((template, direction, note = '') => {
    setState((prev) => {
      if (!prev.user || !prev.activeFriendId) return prev;

      // Pass ise kart oluşma yok, sadece free pass kontrolü ve bildirim
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
    // Reklam izlendikten sonra free pass'i resetler (ya da ek pass verir)
    setState((prev) => ({ ...prev, freePassUsed: false }));
  }, []);

  const setAvatar = useCallback((avatarKey) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, avatar: avatarKey } : prev.user,
    }));
  }, []);

  // ---- Computed --------------------------------------------------------------
  const activeFriend = useMemo(
    () => state.friends.find((f) => f.id === state.activeFriendId) || null,
    [state.friends, state.activeFriendId]
  );

  const chequesForActiveFriend = useMemo(() => {
    if (!state.activeFriendId) return { mine: [], theirs: [] };
    const mine = state.cheques
      .filter((c) => c.friendId === state.activeFriendId && c.ownerId === state.user?.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    const theirs = state.cheques
      .filter((c) => c.friendId === state.activeFriendId && c.ownerId !== state.user?.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    return { mine, theirs };
  }, [state.cheques, state.activeFriendId, state.user]);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      activeFriend,
      chequesForActiveFriend,
      unreadCount,
      signUp,
      signIn,
      signOut,
      setOnboarded,
      setActiveFriend,
      addFriend,
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
      activeFriend,
      chequesForActiveFriend,
      unreadCount,
      signUp,
      signIn,
      signOut,
      setOnboarded,
      setActiveFriend,
      addFriend,
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
