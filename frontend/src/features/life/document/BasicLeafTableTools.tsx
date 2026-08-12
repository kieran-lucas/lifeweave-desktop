import type { Editor } from "@tiptap/core";
import * as styles from "./BasicLeafDocument.css";

const controls = [
  ["Add row", "addRowAfter"],
  ["Add column", "addColumnAfter"],
  ["Delete row", "deleteRow"],
  ["Delete column", "deleteColumn"],
  ["Delete table", "deleteTable"],
] as const;

export default function BasicLeafTableTools({ editor }: { editor: Editor }) {
  return <div className={styles.tableTools} role="toolbar" aria-label="Table editing">
    <span className={styles.tableHint}>Table</span>
    {controls.map(([label, command]) => <button key={command} type="button" className={styles.toolbarButton} aria-label={label} onClick={() => editor.chain().focus()[command]().run()}>{label}</button>)}
    <span className={styles.tableHint}>Tab moves between cells.</span>
  </div>;
}
