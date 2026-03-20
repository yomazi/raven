import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_DAY_MS,
      gcTime: ONE_DAY_MS,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "raven-query-cache",
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: ONE_DAY_MS,
});
