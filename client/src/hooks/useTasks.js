import { createTask, deleteTask, fetchTask, fetchTasks, updateTask } from "@api/tasks.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// ─── query key factory ───────────────────────────────────────────────────────

export const taskKeys = {
  all: ["tasks"],
  list: (params) => ["tasks", "list", params],
  detail: (id) => ["tasks", "detail", id],
};

// Mirrors the server-side filtering in tasks.service.js#getAllTasks, so a
// cached list query can tell whether an updated task still belongs in it.
function taskMatchesParams(task, params = {}) {
  const { showFolderId, linked, status, priority } = params;

  if (showFolderId) {
    if (task.showFolderId !== showFolderId) return false;
  } else if (linked === true || linked === "true") {
    if (!task.showFolderId) return false;
  } else if (linked === false || linked === "false") {
    if (task.showFolderId) return false;
  }

  if (status && !status.split(",").includes(task.status)) return false;
  if (priority && !priority.split(",").includes(task.priority)) return false;

  return true;
}

// ─── hooks ───────────────────────────────────────────────────────────────────

/**
 * useTasks — fetch all tasks, with optional filter params.
 *
 * params: { showFolderId?, linked?: 'true'|'false', status?, priority?, sort?, order? }
 */
export function useTasks(params = {}, options = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    ...options,
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      // Patch every cached "list" query in place rather than invalidating
      // (avoids a refetch flash on inline grid edits) — but a status/priority
      // change can move a task out of a filtered list's results, so each
      // query's own params decide whether to update it or drop it.
      for (const query of qc.getQueryCache().findAll({ queryKey: taskKeys.all })) {
        const prev = query.state.data;
        if (!Array.isArray(prev)) continue;

        const params = query.queryKey[2] ?? {};
        const exists = prev.some((t) => t._id === updatedTask._id);
        const matches = taskMatchesParams(updatedTask, params);

        let next = prev;
        if (matches) {
          next = exists
            ? prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
            : [...prev, updatedTask];
        } else if (exists) {
          next = prev.filter((t) => t._id !== updatedTask._id);
        }

        qc.setQueryData(query.queryKey, next);
      }
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useTaskEvents() {
  const qc = useQueryClient();
  const sourceRef = useRef(null);
  const retryTimer = useRef(null);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;

      const source = new EventSource("/api/v1/tasks/events");
      sourceRef.current = source;

      function invalidate() {
        qc.invalidateQueries({ queryKey: taskKeys.all });
      }

      source.addEventListener("task_created", invalidate);
      source.addEventListener("task_updated", invalidate);
      source.addEventListener("task_deleted", invalidate);

      source.addEventListener("error", () => {
        source.close();
        sourceRef.current = null;
        if (!active) return;
        retryTimer.current = setTimeout(connect, 5_000);
      });
    }

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer.current);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [qc]);
}
