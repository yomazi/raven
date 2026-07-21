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

// Admin/config data that can be changed outside the app's own write path —
// migrations, one-off scripts, a deploy adding/removing a report definition
// — with nothing to invalidate a persisted copy when that happens. Every
// query key in this list must also set `staleTime: 0` on its own useQuery
// call (persistence exclusion alone only stops a stale copy from surviving
// a reload; staleTime:0 is what forces a refetch on remount/reopen too).
// Add to this list, not just the one query, next time this bites us.
const NEVER_PERSIST_QUERY_KEYS = ["settings", "reports", "report-schedules"];

persistQueryClient({
  queryClient,
  persister,
  maxAge: ONE_DAY_MS,
  // Bump this whenever a cached query's response shape changes — otherwise
  // a stale persisted cache (up to staleTime old) can rehydrate the OLD
  // shape and silently break consumers expecting the new one. Cheap: it
  // just forces one extra round of refetches across the app, not data loss.
  buster: "2026-07-21-settings-test-prod-split",
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      !NEVER_PERSIST_QUERY_KEYS.includes(query.queryKey[0]) && query.state.status === "success",
  },
});
