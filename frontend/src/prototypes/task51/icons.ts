import * as paths from "../../design-system/visual/icons";

/**
 * The prototype's name -> path lookup.
 *
 * Production imports the individual icon constants so the bundler can drop the ones it does not
 * render; that is what keeps `index.js` under its locked ceiling. The prototype renders icons by
 * dynamic name and is a separate Vite entry that never reaches the shipped bundle, so it can afford
 * the convenient map. Keeping the map *here* rather than in the shared module is the whole point.
 */
export const icons = {
  today: paths.iconToday,
  calendar: paths.iconCalendar,
  analytics: paths.iconAnalytics,
  plans: paths.iconPlans,
  life: paths.iconLife,
  reader: paths.iconReader,
  search: paths.iconSearch,
  settings: paths.iconSettings,
  chevronLeft: paths.iconChevronLeft,
  chevronRight: paths.iconChevronRight,
  moon: paths.iconMoon,
  panelLeft: paths.iconPanelLeft,
  circle: paths.iconCircle,
  checkCircle: paths.iconCheckCircle,
  flag: paths.iconFlag,
  flagFilled: paths.iconFlagFilled,
  note: paths.iconNote,
  details: paths.iconDetails,
  subtasks: paths.iconSubtasks,
  link: paths.iconLink,
  more: paths.iconMore,
  dismiss: paths.iconDismiss,
} as const;

export type IconName = keyof typeof icons;
