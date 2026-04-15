import { create } from 'zustand';
import { User } from '../types';
import { onAuthChange } from '../services/authService';
import { watchUser } from '../services/userService';
import { auth } from '../services/firebase';

interface AuthState {
  user:          User | null;
  firebaseUser:  any | null;
  isLoading:     boolean;
  isInitialized: boolean;
  _unsubUser:    (() => void) | null;

  init:    () => () => void;
  setUser: (u: User | null) => void;
  clear:   () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:          null,
  firebaseUser:  null,
  isLoading:     true,
  isInitialized: false,
  _unsubUser:    null,

  init() {
    const unsubAuth = onAuthChange((fbUser) => {
      // Önceki Firestore listener'ı temizle
      get()._unsubUser?.();

      if (!fbUser) {
        set({ user: null, firebaseUser: null, isLoading: false, isInitialized: true, _unsubUser: null });
        return;
      }

      set({ firebaseUser: fbUser, isLoading: true });

      const unsubUser = watchUser(fbUser.uid, (profile) => {
        set({ user: profile, isLoading: false, isInitialized: true });
      });

      set({ _unsubUser: unsubUser });
    });

    return unsubAuth;
  },

  setUser(u) { set({ user: u }); },
  clear()    { set({ user: null, firebaseUser: null }); },
}));
