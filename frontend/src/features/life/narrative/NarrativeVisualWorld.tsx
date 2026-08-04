import type { PropsWithChildren } from "react";
import type { NarrativeVisualWorldId } from "./visualWorlds";
import * as styles from "./NarrativeVisualWorld.css";

export function NarrativeVisualWorld({ id, children }: PropsWithChildren<{ id: NarrativeVisualWorldId }>) {
  return <div className={`${styles.world} ${styles[id]}`} data-visual-world={id}>{children}</div>;
}
