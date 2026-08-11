export type SidebarMode = "expanded" | "collapsed";

/** The breakpoint was measured and approved in the Task 51 full-shell prototype. */
export const compactShellQuery = "(max-width: 1180px)";

export function sidebarIsCollapsed({
  compactViewport,
  lifeAutoCollapsed,
  taskSidebarMode,
}: {
  compactViewport: boolean;
  lifeAutoCollapsed: boolean;
  taskSidebarMode: SidebarMode;
}) {
  return compactViewport || lifeAutoCollapsed || taskSidebarMode === "collapsed";
}
