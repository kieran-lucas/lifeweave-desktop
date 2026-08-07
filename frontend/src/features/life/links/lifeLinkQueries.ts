import type { QueryClient } from "@tanstack/react-query";

export const lifeLinkKeys = {
  all: ["life-links"] as const,
  panels: ["life-links", "panel"] as const,
  panel: (nodeId: string) => ["life-links", "panel", nodeId] as const,
  targets: (sourceNodeId: string, query: string) =>
    ["life-links", "targets", sourceNodeId, query] as const,
  targetPrefix: ["life-links", "targets"] as const,
};

/**
 * The Life graph projection draws these links, so creating or removing one has to refresh it.
 *
 * This is the only gap. Tree mutations, pin changes, and branch import already invalidate the
 * `["life"]` prefix that covers the graph; only link create/remove is keyed solely under
 * `["life-links"]`. Document lifecycle — the other caller of `invalidateLifeLinkLifecycle` — changes
 * neither the hierarchy nor any link row, so it is deliberately not widened here.
 */
const lifeGraphKey = ["life", "graph"] as const;

export const invalidateLifeLinkMutations = (
  client: QueryClient,
  sourceNodeId: string,
  targetNodeId: string,
) =>
  Promise.all([
    client.invalidateQueries({ queryKey: lifeLinkKeys.panel(sourceNodeId) }),
    client.invalidateQueries({ queryKey: lifeLinkKeys.panel(targetNodeId) }),
    client.invalidateQueries({ queryKey: lifeLinkKeys.targetPrefix }),
    client.invalidateQueries({ queryKey: lifeGraphKey }),
  ]);

export const invalidateLifeLinkLifecycle = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: lifeLinkKeys.all });
