import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const LOADER_COUNT = 33;

const useRavenStore = create(
  persist(
    (set) => ({
      // ── status
      statusMessage: null,
      setStatusMessage: (text, type = "info") => set({ statusMessage: { text, type } }),
      clearStatusMessage: () => set({ statusMessage: null }),

      // ── overlay
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

      // ── shows
      selectedShow: null,
      setSelectedShow: (show) => set({ selectedShow: show }),

      isSelectedShowVisible: false,
      setIsSelectedShowVisible: (val) => set({ isSelectedShowVisible: val }),

      // ── layout
      leftPaneWidth: 750,
      setLeftPaneWidth: (width) => set({ leftPaneWidth: width }),

      // ── escape-key arbitration — lets an open overlay (e.g. the
      // recipient picker's "more recipients" dropdown) claim Escape for
      // itself without RosterGrid's global Escape-clears-filter shortcut
      // also firing on the same keypress.
      suppressGridEscapeClear: false,
      setSuppressGridEscapeClear: (val) => set({ suppressGridEscapeClear: val }),

      // ── task filters
      filterStatus: ["to_do", "in_progress", "blocked"],
      filterPriority: [],
      filterLinked: "all",

      toggleFilterStatus: (val) =>
        set((s) => ({
          filterStatus: s.filterStatus.includes(val)
            ? s.filterStatus.filter((v) => v !== val)
            : [...s.filterStatus, val],
        })),

      toggleFilterPriority: (val) =>
        set((s) => ({
          filterPriority: s.filterPriority.includes(val)
            ? s.filterPriority.filter((v) => v !== val)
            : [...s.filterPriority, val],
        })),

      setFilterLinked: (val) => set({ filterLinked: val }),

      clearTaskFilters: () => set({ filterStatus: [], filterPriority: [], filterLinked: "all" }),
    }),
    {
      name: "raven-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ leftPaneWidth: state.leftPaneWidth }),
      // filters intentionally excluded from partialize — reset on new session
    }
  )
);

export default useRavenStore;
