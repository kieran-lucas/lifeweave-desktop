import {
  Icon,
  iconAnalytics,
  iconApps,
  iconCalendar,
  iconCircle,
  iconDetails,
  iconFlag,
  iconLife,
  iconLink,
  iconNote,
  iconPlans,
  iconReader,
  iconSubtasks,
} from "../../design-system/visual/icons";
import * as styles from "./categoryIcons.css";

const fallbackIcons = [iconNote, iconFlag, iconSubtasks, iconDetails, iconCircle] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Category iconography is intentionally richer than a generic dot/diamond pair.
 *
 * Known semantic words receive the closest existing Fluent glyph. User-defined labels without a
 * known semantic hint are deterministically distributed across a small neutral fallback set, so a
 * category keeps the same icon across Calendar/Today/Analytics without persisting new domain data.
 */
function iconForCategory(iconKey: string, label: string): string {
  const value = `${iconKey} ${label}`.toLowerCase();
  if (iconKey === "category-general") return iconApps;
  if (/(read|study|book|english|learn|course|school)/.test(value)) return iconReader;
  if (/(plan|goal|focus|milestone|project)/.test(value)) return iconPlans;
  if (/(code|coding|cs|technical|software|program)/.test(value)) return iconSubtasks;
  if (/(physics|olympic|science|experiment)/.test(value)) return iconAnalytics;
  if (/(life|health|wellness|home|personal)/.test(value)) return iconLife;
  if (/(calendar|time|schedule|event|meeting|deadline)/.test(value)) return iconCalendar;
  if (/(data|analytic|metric|finance|money|budget|stat)/.test(value)) return iconAnalytics;
  if (/(link|web|online|research)/.test(value)) return iconLink;
  if (/(note|write|journal|idea|document)/.test(value)) return iconNote;

  const fallback = fallbackIcons[stableHash(value) % fallbackIcons.length];
  if (fallback === undefined) {
    throw new Error("Category icon fallback set must not be empty");
  }
  return fallback;
}

export function CategoryIcon({ iconKey, label }: { iconKey: string; label: string }) {
  return (
    <span role="img" aria-label={label} data-icon-key={iconKey} className={styles.mark}>
      <Icon d={iconForCategory(iconKey, label)} size={16} />
    </span>
  );
}
