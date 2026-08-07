import { useQuery } from "@tanstack/react-query";
import { getLifeGraphProjection } from "../../../ipc/commands";

/**
 * The graph is a projection cache entry under the `["life"]` prefix, so every Life tree mutation,
 * pin change, and branch import already invalidates it. Link mutations are keyed under
 * `["life-links"]` and invalidate this key explicitly — see `links/lifeLinkQueries.ts`.
 */
export const lifeGraphKeys = { projection: ["life", "graph"] as const };

export const useLifeGraphProjection = () =>
  useQuery({
    queryKey: lifeGraphKeys.projection,
    queryFn: () => getLifeGraphProjection(),
    // Nothing about the graph is persisted, so it is always refetched from Rust authority.
    gcTime: 0,
    retry: false,
  });
