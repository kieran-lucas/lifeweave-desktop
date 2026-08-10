import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNarrativeDocument } from "../../../ipc/commands";
import { operationId } from "./schema";
import { narrativeKey } from "./NarrativeCanvasReader";
import * as styles from "../document/BasicLeafDocument.css";
import { invalidateLifeLinkLifecycle } from "../links/lifeLinkQueries";

const templates = [
  { id: "knowledge_dossier", name: "Knowledge Dossier", description: "Organize a subject into overview, evidence, and chronology.", scenes: ["Overview", "Evidence", "Timeline"] },
  { id: "project_blueprint", name: "Project Blueprint", description: "Shape a project from vision through planning, milestones, and review.", scenes: ["Vision", "Plan", "Milestones", "Review"] },
  { id: "learning_journey", name: "Learning Journey", description: "Guide learning from goals and concepts through practice and reflection.", scenes: ["Goals", "Concepts", "Practice", "Reflection"] },
] as const;

export function NarrativeTemplateChooser({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false); const [selected, setSelected] = useState<typeof templates[number]["id"]>("knowledge_dossier");
  const trigger = useRef<HTMLButtonElement>(null); const client = useQueryClient(); const attempt = useRef<string | undefined>(undefined);
  const create = useMutation({ mutationFn: () => { attempt.current ??= operationId("narrative-create"); return createNarrativeDocument({ life_node_id: nodeId, operation_id: attempt.current, template_id: selected }); }, onSuccess: () => void Promise.all([client.invalidateQueries({ queryKey: narrativeKey(nodeId) }), invalidateLifeLinkLifecycle(client)]) });
  if (!open) return <button ref={trigger} className={styles.button} onClick={() => setOpen(true)}>Create Narrative Canvas</button>;
  const choose = (id: typeof selected) => { if (id !== selected) { setSelected(id); attempt.current = undefined; } };
  return <fieldset className={styles.templateChooser} disabled={create.isPending}><legend>Choose a Canvas template</legend>{templates.map(t => <label key={t.id} className={styles.templateOption}><input type="radio" name="narrative-template" checked={selected===t.id} onChange={() => choose(t.id)} /> <strong>{t.name}</strong><span>{t.description}</span><span>{t.scenes.join(" · ")}</span></label>)}<div className={styles.actions}><button className={styles.primary} onClick={() => create.mutate()}>{create.isPending ? "Creating Canvas…" : "Create Canvas"}</button><button className={styles.button} onClick={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }}>Cancel</button></div>{create.isPending && <p aria-live="polite">Creating Canvas…</p>}{create.isError && <p role="alert">The Narrative Canvas could not be created.</p>}</fieldset>;
}
