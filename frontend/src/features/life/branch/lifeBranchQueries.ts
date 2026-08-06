import type { QueryClient } from "@tanstack/react-query";
import { invalidateLifeLinkLifecycle } from "../links/lifeLinkQueries";
import { invalidateTaskSavedViewReferenceData } from "../../task/saved-views/savedViewQueries";

/**
 * A branch import creates Life nodes, both document kinds, tags, and links at once, so every
 * projection built on any of those has to be refetched. `["life"]` is a prefix that already covers
 * browse, edit, document, narrative, pinned, and related-tasks.
 */
export const invalidateLifeBranchImport = (client: QueryClient) =>
  Promise.allSettled([
    client.invalidateQueries({ queryKey: ["life"] }),
    client.invalidateQueries({ queryKey: ["search"] }),
    client.invalidateQueries({ queryKey: ["tags"] }),
    client.invalidateQueries({ queryKey: ["task-life-targets"] }),
    invalidateTaskSavedViewReferenceData(client),
    invalidateLifeLinkLifecycle(client),
  ]);
