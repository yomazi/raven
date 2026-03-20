import { create } from "zustand";

const useShowsStore = create((set) => ({
  statusMessage: null,

  setStatusMessage: (text, type = "info") => {
    set({ statusMessage: { text, type } });
  },

  clearStatusMessage: () => {
    set({ statusMessage: null });
  },
}));

export default useShowsStore;
