// Global eşleşme (partner) store — tüm sayfalar bu state'i paylaşır
import { create } from 'zustand';
import { Match } from '../types';
import { watchMyMatches } from '../services/matchService';

interface MatchState {
  matches:         Match[];
  selectedMatch:   Match | null;
  isLoading:       boolean;

  init:          () => () => void;
  selectMatch:   (match: Match) => void;
  clearMatches:  () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches:       [],
  selectedMatch: null,
  isLoading:     true,

  init() {
    const unsub = watchMyMatches((matches) => {
      const current = get().selectedMatch;
      // Seçili eşleşmeyi güncelle (liste değişince hâlâ geçerli mi?)
      const stillSelected = current
        ? matches.find((m) => m.matchId === current.matchId) ?? matches[0] ?? null
        : matches[0] ?? null;

      set({ matches, selectedMatch: stillSelected, isLoading: false });
    });
    return unsub;
  },

  selectMatch(match) { set({ selectedMatch: match }); },
  clearMatches()     { set({ matches: [], selectedMatch: null }); },
}));
