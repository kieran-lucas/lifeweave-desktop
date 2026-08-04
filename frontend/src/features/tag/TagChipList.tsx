import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";
import * as styles from "./TagChipList.css";

type TagChipListProps = {
  tags?: TagSummaryView[];
  maxVisible?: number;
};

export function TagChipList({ tags = [], maxVisible = 4 }: TagChipListProps) {
  if (!tags.length) return null;
  const visible = tags.slice(0, maxVisible);
  const hidden = tags.slice(maxVisible);
  return (
    <ul className={styles.list} aria-label="Tags">
      {visible.map((tag) => (
        <li key={tag.id} className={styles.chip}>
          #{tag.name}
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <span
            className={styles.overflow}
            aria-label={`${hidden.length} more tags: ${hidden.map((t) => t.name).join(", ")}`}
          >
            +{hidden.length}
          </span>
        </li>
      )}
    </ul>
  );
}
