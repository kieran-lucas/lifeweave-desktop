import type { QueryClient } from "@tanstack/react-query";

export const taskSavedViewKeys = {
  active: ["task-saved-views", "active"] as const,
  archived: ["task-saved-views", "archived"] as const,
  detail: (viewId: string) => ["task-saved-view", viewId] as const,
  options: (viewId: string | null) => ["task-saved-view-options", viewId] as const,
  projection: (viewId: string, anchorLocalDate: string) =>
    ["task-saved-view-projection", viewId, anchorLocalDate] as const,
  projectionPrefix: ["task-saved-view-projection"] as const,
};

export const invalidateTaskSavedViewProjections = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: taskSavedViewKeys.projectionPrefix });

export const invalidateTaskSavedViewReferenceData = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: taskSavedViewKeys.projectionPrefix }),
    client.invalidateQueries({ queryKey: ["task-saved-view-options"] }),
  ]);
