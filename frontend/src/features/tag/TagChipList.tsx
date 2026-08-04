import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";
import * as styles from "./TagChipList.css";

export function TagChipList({ tags = [] }: { tags?: TagSummaryView[] }) {
  if (!tags.length) return null;
  return (
    <ul className={styles.list} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag.id} className={styles.chip}>
          {tag.name}
        </li>
      ))}
    </ul>
  );
}
