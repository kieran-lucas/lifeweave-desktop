import { useEffect, useState, type ComponentProps } from "react";
import { LoadingRow } from "../../../design-system/primitives/States";

type Composer = typeof import("./TaskComposer").default;
let loadedComposer: Composer | null = null;

// Load only when opened, and commit as soon as the local chunk is available.
// A newly mounted Suspense fallback delays the first dialog's reveal in React.
export function DeferredTaskComposer(props: ComponentProps<Composer>) {
  const [Composer, setComposer] = useState<Composer | null>(() => loadedComposer);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (Composer) return;
    let active = true;
    void import("./TaskComposer").then(
      (module) => {
        loadedComposer = module.default;
        if (active) setComposer(() => module.default);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause : new Error("Unable to load task composer."));
      },
    );
    return () => { active = false; };
  }, [Composer]);

  if (error) throw error;
  return Composer ? <Composer {...props} /> : <LoadingRow label="Loading task composer…" />;
}
