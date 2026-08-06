import type { QueryClient } from "@tanstack/react-query";

export const lifeLinkKeys = {
  all: ["life-links"] as const,
  panels: ["life-links", "panel"] as const,
  panel: (nodeId: string) => ["life-links", "panel", nodeId] as const,
  targets: (sourceNodeId: string, query: string) =>
    ["life-links", "targets", sourceNodeId, query] as const,
  targetPrefix: ["life-links", "targets"] as const,
};

export const invalidateLifeLinkMutations = (
  client: QueryClient,
  sourceNodeId: string,
  targetNodeId: string,
) =>
  Promise.all([
    client.invalidateQueries({ queryKey: lifeLinkKeys.panel(sourceNodeId) }),
    client.invalidateQueries({ queryKey: lifeLinkKeys.panel(targetNodeId) }),
    client.invalidateQueries({ queryKey: lifeLinkKeys.targetPrefix }),
  ]);

export const invalidateLifeLinkLifecycle = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: lifeLinkKeys.all });
