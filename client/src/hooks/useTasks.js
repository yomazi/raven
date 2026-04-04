import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createTask, deleteTask, fetchTask, fetchTasks, updateTask } from "../api/tasks.api.js";

// ─── constants ───────────────────────────────────────────────────────────────

import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
} from "@shared/constants/tasks.js";

// ─── query key factory ───────────────────────────────────────────────────────

export const taskKeys = {
  all: ["tasks"],
  list: (params) => ["tasks", "list", params],
  detail: (id) => ["tasks", "detail", id],
};

// ─── hooks ───────────────────────────────────────────────────────────────────

/**
 * useTasks — fetch all tasks, with optional filter params.
 *
 * params: { showFolderId?, linked?: 'true'|'false', status?, priority?, sort?, order? }
 */
export function useTasks(params = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
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
