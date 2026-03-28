import { create } from "zustand";

const LOADER_COUNT = 33; // keep in sync with Overlay's LOADERS array length

const useShowsStore = create((set) => ({
  statusMessage: null,
  setStatusMessage: (text, type = "info") => set({ statusMessage: { text, type } }),
  clearStatusMessage: () => set({ statusMessage: null }),

  // Overlay state
  syncPhase: null,
  statusText: null,
  loaderIndex: 0,
  setSyncPhase: (phase, text = null) =>
    set({
      syncPhase: phase,
      statusText: text,
      loaderIndex: Math.floor(Math.random() * LOADER_COUNT),
    }),
  clearSyncPhase: () => set({ syncPhase: null, statusText: null }),

  selectedShow: null,
  setSelectedShow: (show) => set({ selectedShow: show }),

  isSelectedShowVisible: false,
  setIsSelectedShowVisible: (val) => set({ isSelectedShowVisible: val }),

  gridWidth: 750,
  setGridWidth: (width) => set({ gridWidth: width }),
}));

export default useShowsStore;
