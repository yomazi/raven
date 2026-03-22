import { create } from "zustand";

const useShowsStore = create((set) => ({
  statusMessage: null,

  setStatusMessage: (text, type = "info") => {
    set({ statusMessage: { text, type } });
  },

  clearStatusMessage: () => {
    set({ statusMessage: null });
  },

  // Overlay state
  syncPhase: null, // null | "syncing" | "loading"
  statusText: null, // text shown below the loader animation
  setSyncPhase: (phase, text = null) => set({ syncPhase: phase, statusText: text }),
  clearSyncPhase: () => set({ syncPhase: null, statusText: null }),

  selectedShow: null,
  setSelectedShow: (show) => set({ selectedShow: show }),

  isSelectedShowVisible: false,
  setIsSelectedShowVisible: (val) => set({ isSelectedShowVisible: val }),
}));

export default useShowsStore;
