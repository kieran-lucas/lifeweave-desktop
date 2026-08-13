import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { healthCheck } from "../ipc/commands";
import { TodayScreen } from "../features/task/today/TodayScreen";
import type { FocusPlanEntryRequest } from "../features/focus-plan/FocusPlansScreen";
const FoundationScreen = lazy(() =>
  import("../features/foundation/FoundationScreen").then((module) => ({
    default: module.FoundationScreen,
  })),
);
const CalendarScreen = lazy(() =>
  import("../features/calendar/CalendarScreen").then((module) => ({
    default: module.CalendarScreen,
  })),
);
const AnalyticsScreen = lazy(() =>
  import("../features/analytics/AnalyticsScreen").then((module) => ({
    default: module.AnalyticsScreen,
  })),
);
const CategoryGoals = lazy(() =>
  import("../features/analytics/CategoryGoals").then((module) => ({
    default: module.CategoryGoals,
  })),
);
const LifeScreen = lazy(() =>
  import("../features/life/LifeScreen").then((module) => ({
    default: module.LifeScreen,
  })),
);
const FocusPlansScreen = lazy(() =>
  import("../features/focus-plan/FocusPlansScreen").then((module) => ({
    default: module.FocusPlansScreen,
  })),
);
const TagSettings = lazy(() =>
  import("../features/tag/TagSettings").then((m) => ({ default: m.TagSettings }))
);
const BackupSettings = lazy(() =>
  import("../features/backup/BackupSettings").then((module) => ({
    default: module.BackupSettings,
  })),
);
import { localToday } from "../features/calendar/date";
import { useLocalDateRollover } from "../features/calendar/useLocalDateRollover";
import type { SearchNavigationTarget } from "../ipc/generated/SearchNavigationTarget";
import {
  Icon,
  iconAnalytics,
  iconBrand,
  iconCalendar,
  iconChevronLeft,
  iconLife,
  iconPanelLeft,
  iconPlans,
  iconSearch,
  iconSettings,
  iconToday,
} from "../design-system/visual/icons";
import { LoadingRow } from "../design-system/primitives/States";
import * as styles from "./App.css";
import { PageFrame, PageHeader } from "./layout/PageFrame";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
const ShortcutHelpDialog = lazy(() =>
  import("./ShortcutHelpDialog").then((module) => ({
    default: module.ShortcutHelpDialog,
  })),
);
import {
  compactShellQuery,
  sidebarIsCollapsed,
  type SidebarMode,
} from "./shellLayout";
import {
  analyticsShortcut,
  destinationShortcuts,
  resolveShortcutCommand,
  searchShortcut,
  shortcutHelpShortcut,
  type Destination,
  type DestinationShortcutCommand,
} from "./keyboardShortcuts";
import {
  pushAppHistoryRoute,
  readAppHistoryEntry,
  replaceAppHistoryRoute,
  sameAppHistoryRoute,
  type AppHistoryRoute,
  type SettingsView,
} from "./navigationHistory";

const GlobalSearchDialog = lazy(
  () => import("../features/search/GlobalSearchDialog"),
);

/** Primary navigation is deliberately compact; Search and Analytics now live under Settings. */
const destinationIcons: Record<Destination, string> = {
  today: iconToday,
  calendar: iconCalendar,
  plans: iconPlans,
  life: iconLife,
  settings: iconSettings,
};

type SearchNavRequest = {
  requestId: string;
  target: SearchNavigationTarget;
} | null;

export function settleNavigationEnvelope(
  current: SearchNavRequest,
  requestId: string,
): SearchNavRequest {
  return current?.requestId === requestId ? null : current;
}
type TodayFocusRequest = {
  requestId: string;
  taskId: string | null;
  seriesId: string | null;
};
type LifeEntryRequest = {
  requestId: string;
  nodeId: string;
  mode: "browse" | "reader";
};
const preferenceKey = "lifeweave.task-sidebar-mode.v1";

function readSidebarMode(): SidebarMode {
  try {
    const value = window.localStorage.getItem(preferenceKey);
    return value === "collapsed" ? "collapsed" : "expanded";
  } catch {
    return "expanded";
  }
}

export function App() {
  const queryClient = useQueryClient();
  const initialEntry = useMemo(() => readAppHistoryEntry(window.history.state) ?? {
    index: 0,
    route: {
      destination: "today" as const,
      settingsView: "general" as const,
      selectedDate: localToday(),
    },
  }, []);
  const initialRoute: AppHistoryRoute = initialEntry.route;
  const [ipcStatus, setIpcStatus] = useState<"ready" | "error">("ready");
  const [destination, setDestination] = useState<Destination>(initialRoute.destination);
  const [settingsView, setSettingsView] = useState<SettingsView>(initialRoute.settingsView);
  const [selectedDate, setSelectedDate] = useState(initialRoute.selectedDate);
  const historyRoute = useRef(initialRoute);
  const historyIndex = useRef(initialEntry.index);
  const [navigationMotion, setNavigationMotion] = useState<"forward" | "back">("forward");
  const anchorLocalDate = useLocalDateRollover();
  const previousAnchor = useRef(anchorLocalDate);
  const [taskSidebarMode, setTaskSidebarMode] =
    useState<SidebarMode>(readSidebarMode);
  const [compactViewport, setCompactViewport] = useState(
    () => window.matchMedia(compactShellQuery).matches,
  );
  const [lifeAutoCollapsed, setLifeAutoCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<SearchNavRequest>(null);
  const headingRef = useRef<HTMLElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const shortcutHelpOpenerRef = useRef<HTMLElement | null>(null);
  const pendingTodayRequestId =
    pendingNav?.target.kind === "today" ? pendingNav.requestId : null;
  const todayFocusRequest = useMemo<TodayFocusRequest | null>(() => {
    if (!pendingNav || pendingNav.target.kind !== "today") return null;
    return {
      requestId: pendingNav.requestId,
      taskId: pendingNav.target.task_id,
      seriesId: pendingNav.target.series_id,
    };
  }, [pendingNav]);
  const lifeEntryRequest = useMemo<LifeEntryRequest | null>(() => {
    if (
      !pendingNav ||
      (pendingNav.target.kind !== "life_browse" &&
        pendingNav.target.kind !== "life_reader")
    )
      return null;
    return {
      requestId: pendingNav.requestId,
      nodeId: pendingNav.target.node_id,
      mode: pendingNav.target.kind === "life_reader" ? "reader" : "browse",
    };
  }, [pendingNav]);
  const focusPlanEntryRequest = useMemo<FocusPlanEntryRequest | null>(() => {
    if (!pendingNav || pendingNav.target.kind !== "focus_plan") return null;
    return {
      requestId: pendingNav.requestId,
      planId: pendingNav.target.plan_id,
    };
  }, [pendingNav]);
  const settleNavigationRequest = useCallback((requestId: string) => {
    setPendingNav((current) => settleNavigationEnvelope(current, requestId));
  }, []);

  const commitRoute = useCallback((next: AppHistoryRoute) => {
    if (!sameAppHistoryRoute(historyRoute.current, next)) {
      historyIndex.current += 1;
      pushAppHistoryRoute(window.history, next, historyIndex.current);
      setNavigationMotion("forward");
    }
    historyRoute.current = next;
    setDestination(next.destination);
    setSettingsView(next.settingsView);
    setSelectedDate(next.selectedDate);
  }, []);

  const replaceSelectedDate = useCallback((nextDate: string) => {
    const next = { ...historyRoute.current, selectedDate: nextDate };
    historyRoute.current = next;
    replaceAppHistoryRoute(window.history, next, historyIndex.current);
    setSelectedDate(nextDate);
  }, []);

  const selectDestination = useCallback((next: Destination) => {
    setPendingNav(null);
    commitRoute({
      destination: next,
      settingsView: "general",
      selectedDate: next === "today" ? anchorLocalDate : historyRoute.current.selectedDate,
    });
  }, [anchorLocalDate, commitRoute]);

  const openSettingsAnalytics = useCallback(() => {
    setPendingNav(null);
    commitRoute({
      destination: "settings",
      settingsView: "analytics",
      selectedDate: historyRoute.current.selectedDate,
    });
  }, [commitRoute]);

  const openSettingsSearch = useCallback(() => {
    setPendingNav(null);
    commitRoute({
      destination: "settings",
      settingsView: "general",
      selectedDate: historyRoute.current.selectedDate,
    });
    setSearchOpen(true);
  }, [commitRoute]);

  const openShortcutHelp = useCallback((opener: HTMLElement | null) => {
    shortcutHelpOpenerRef.current = opener;
    setShortcutHelpOpen(true);
  }, []);
  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
    const opener = shortcutHelpOpenerRef.current;
    shortcutHelpOpenerRef.current = null;
    requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!pendingTodayRequestId && selectedDate === previousAnchor.current)
      replaceSelectedDate(anchorLocalDate);
    previousAnchor.current = anchorLocalDate;
  }, [anchorLocalDate, pendingTodayRequestId, replaceSelectedDate, selectedDate]);
  useEffect(() => {
    replaceAppHistoryRoute(window.history, historyRoute.current, historyIndex.current);
    const handlePopState = (event: PopStateEvent) => {
      const entry = readAppHistoryEntry(event.state);
      if (!entry) return;
      const next = entry.route;
      setNavigationMotion(entry.index < historyIndex.current ? "back" : "forward");
      historyIndex.current = entry.index;
      historyRoute.current = next;
      setPendingNav(null);
      setSearchOpen(false);
      setShortcutHelpOpen(false);
      shortcutHelpOpenerRef.current = null;
      setDestination(next.destination);
      setSettingsView(next.settingsView);
      setSelectedDate(next.selectedDate);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      healthCheck()
        .catch(() => setIpcStatus("error"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(preferenceKey, taskSidebarMode);
    } catch {
      /* storage is optional */
    }
  }, [taskSidebarMode]);
  useEffect(() => {
    const query = window.matchMedia(compactShellQuery);
    const update = (event: MediaQueryListEvent) => setCompactViewport(event.matches);
    setCompactViewport(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setLifeAutoCollapsed(destination === "life");
    requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }, [destination, settingsView]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const command = resolveShortcutCommand(event);
      if (!command) return;
      event.preventDefault();
      if (command.id === analyticsShortcut.id) openSettingsAnalytics();
      else if (command.id === searchShortcut.id) openSettingsSearch();
      else if (command.destination) selectDestination(command.destination);
      else openShortcutHelp(document.activeElement as HTMLElement | null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSettingsAnalytics, openSettingsSearch, openShortcutHelp, selectDestination]);

  const handleSearchNavigate = (target: SearchNavigationTarget) => {
    const requestId = globalThis.crypto.randomUUID();
    if (target.kind === "today") {
      commitRoute({ destination: "today", settingsView: "general", selectedDate: target.local_date });
    } else if (target.kind === "focus_plan") {
      commitRoute({ destination: "plans", settingsView: "general", selectedDate: historyRoute.current.selectedDate });
    } else {
      commitRoute({ destination: "life", settingsView: "general", selectedDate: historyRoute.current.selectedDate });
    }
    setPendingNav({ requestId, target });
  };
  const navigateToLifeNode = (nodeId: string) => {
    commitRoute({ destination: "life", settingsView: "general", selectedDate: historyRoute.current.selectedDate });
    setPendingNav({
      requestId: globalThis.crypto.randomUUID(),
      target: { kind: "life_browse", node_id: nodeId },
    });
  };
  const navigateToFocusPlan = (planId: string) => {
    commitRoute({ destination: "plans", settingsView: "general", selectedDate: historyRoute.current.selectedDate });
    setPendingNav({
      requestId: globalThis.crypto.randomUUID(),
      target: { kind: "focus_plan", plan_id: planId },
    });
  };
  const navigateToTask = (
    localDate: string,
    taskId: string | null,
    seriesId: string | null,
  ) => {
    commitRoute({ destination: "today", settingsView: "general", selectedDate: localDate });
    setPendingNav({
      requestId: globalThis.crypto.randomUUID(),
      target: {
        kind: "today",
        local_date: localDate,
        task_id: taskId,
        series_id: seriesId,
        original_local_date: null,
      },
    });
  };

  const collapsed = sidebarIsCollapsed({
    compactViewport,
    lifeAutoCollapsed,
    taskSidebarMode,
  });
  const renderDestination = (command: DestinationShortcutCommand) => (
    <button
      key={command.id}
      type="button"
      className={styles.navButton}
      onClick={() => selectDestination(command.destination)}
      aria-current={destination === command.destination ? "page" : undefined}
      aria-label={command.label}
      aria-keyshortcuts={command.ariaKeyShortcuts}
    >
      <Icon d={destinationIcons[command.destination]} className={styles.navIcon} />
      <span className={styles.navLabel}>{command.label}</span>
    </button>
  );
  const activateCalendarDate = (date: string) => {
    setPendingNav(null);
    commitRoute({ destination: "today", settingsView: "general", selectedDate: date });
    requestAnimationFrame(() =>
      document.getElementById("today-heading")?.focus({ preventScroll: true }),
    );
  };
  return (
    <div
      className={styles.appRoot}
      data-sidebar-mode={collapsed ? "collapsed" : "expanded"}
    >
      <nav className={styles.sidebar} aria-label="Primary navigation">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Icon d={iconBrand} size={30} className={styles.brandGlyph} />
          </span>
          <span className={styles.navLabel}>Lifeweave</span>
        </div>
        <div className={styles.navGroup}>
          {destinationShortcuts.slice(0, 4).map(renderDestination)}
          <div className={styles.divider} />
          {destinationShortcuts.slice(4).map(renderDestination)}
        </div>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={() =>
            setTaskSidebarMode(
              taskSidebarMode === "expanded" ? "collapsed" : "expanded",
            )
          }
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={taskSidebarMode === "collapsed"}
        >
          <Icon d={iconPanelLeft} className={styles.navIcon} />
          <span className={styles.navLabel}>
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </button>
      </nav>
      <main
        className={styles.viewport}
        data-app-viewport=""
        data-destination={destination}
        data-navigation-motion={navigationMotion}
      >
        {ipcStatus === "error" && (
          <p className={styles.coreStatus} role="alert">
            Application core unavailable.
          </p>
        )}
        {ipcStatus === "ready" && (
          <RouteErrorBoundary key={destination} destination={destination}>
            {destination === "settings" && settingsView === "general" && (
              <PageFrame
                as="section"
                type="standard"
                ref={headingRef}
                aria-labelledby="settings-heading"
              >
                <PageHeader>
                  <h1
                    id="settings-heading"
                    tabIndex={-1}
                    className={styles.heading}
                  >
                    Settings
                  </h1>
                  <p className={styles.lede}>
                    Application tools, preferences, backup and verification.
                  </p>
                </PageHeader>
                <section
                  className={styles.settingsSection}
                  aria-labelledby="settings-tools-heading"
                >
                  <h2 id="settings-tools-heading">Tools</h2>
                  <p>Search the local workspace or inspect objective analytics from one place.</p>
                  <div className={styles.settingsToolGrid}>
                    <button
                      ref={searchTriggerRef}
                      type="button"
                      className={styles.settingsToolButton}
                      onClick={openSettingsSearch}
                      aria-keyshortcuts={searchShortcut.ariaKeyShortcuts}
                    >
                      <Icon d={iconSearch} className={styles.settingsToolIcon} />
                      <span>
                        <strong>Search</strong>
                        <small>Find tasks, plans and Life content · {searchShortcut.chord}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.settingsToolButton}
                      onClick={openSettingsAnalytics}
                      aria-keyshortcuts={analyticsShortcut.ariaKeyShortcuts}
                    >
                      <Icon d={iconAnalytics} className={styles.settingsToolIcon} />
                      <span>
                        <strong>Analytics</strong>
                        <small>Review scheduled, recorded and focus-plan activity · {analyticsShortcut.chord}</small>
                      </span>
                    </button>
                  </div>
                </section>
                <Suspense fallback={<LoadingRow label="Loading category goals…" />}>
                  <CategoryGoals />
                </Suspense>
                <Suspense fallback={<LoadingRow label="Loading tag settings…" />}>
                  <TagSettings />
                </Suspense>
                <Suspense fallback={<LoadingRow label="Loading backup settings…" />}>
                  <BackupSettings onDatabaseRestored={() => queryClient.clear()} />
                </Suspense>
                <section
                  className={styles.settingsSection}
                  aria-labelledby="settings-keyboard-heading"
                >
                  <h2 id="settings-keyboard-heading">Keyboard</h2>
                  <p>
                    Review the global shortcuts. Press {shortcutHelpShortcut.chord} anywhere outside
                    a text field, document editor, or open dialog.
                  </p>
                  <div>
                    <button
                      type="button"
                      className={styles.dialogButton}
                      aria-keyshortcuts={shortcutHelpShortcut.ariaKeyShortcuts}
                      onClick={(event) => openShortcutHelp(event.currentTarget)}
                    >
                      {shortcutHelpShortcut.label}
                    </button>
                  </div>
                </section>
                <section
                  className={styles.settingsSection}
                  aria-labelledby="settings-foundation-heading"
                >
                  <h2 id="settings-foundation-heading">Foundation tools</h2>
                  <p>FoundationRecord verification tools.</p>
                  <Suspense fallback={<LoadingRow label="Loading foundation tools…" />}>
                    <FoundationScreen />
                  </Suspense>
                </section>
              </PageFrame>
            )}
            {destination === "settings" && settingsView === "analytics" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
                className={styles.settingsSubpage}
              >
                <PageFrame as="div" type="standard">
                  <button
                    type="button"
                    className={styles.settingsBackButton}
                    onClick={() => commitRoute({
                      destination: "settings",
                      settingsView: "general",
                      selectedDate: historyRoute.current.selectedDate,
                    })}
                    aria-label="Back to Settings"
                  >
                    <Icon d={iconChevronLeft} size={18} />
                    Settings
                  </button>
                </PageFrame>
                <Suspense fallback={<LoadingRow label="Loading analytics…" />}>
                  <AnalyticsScreen onPlanNavigate={navigateToFocusPlan} />
                </Suspense>
              </div>
            )}
            {destination === "today" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <TodayScreen
                  selectedDate={selectedDate}
                  anchorLocalDate={anchorLocalDate}
                  onSelectedDateChange={replaceSelectedDate}
                  onLifeNavigate={navigateToLifeNode}
                  onFocusPlanNavigate={navigateToFocusPlan}
                  focusRequest={todayFocusRequest}
                  onFocusRequestSettled={settleNavigationRequest}
                />
              </div>
            )}
            {destination === "calendar" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <Suspense fallback={<LoadingRow label="Loading calendar…" />}>
                  <CalendarScreen
                    selectedDate={selectedDate}
                    today={localToday()}
                    onActivateDate={activateCalendarDate}
                  />
                </Suspense>
              </div>
            )}
            {destination === "plans" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <Suspense fallback={<LoadingRow label="Loading plans…" />}>
                  <FocusPlansScreen
                    entryRequest={focusPlanEntryRequest}
                    onEntryRequestSettled={settleNavigationRequest}
                    anchorLocalDate={anchorLocalDate}
                    onTaskNavigate={navigateToTask}
                  />
                </Suspense>
              </div>
            )}
            {destination === "life" && (
              <div
                className={styles.lifeRoute}
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <Suspense fallback={<LoadingRow label="Loading Life System…" />}>
                  <LifeScreen
                    anchorLocalDate={anchorLocalDate}
                    onTaskNavigate={navigateToTask}
                    entryRequest={lifeEntryRequest}
                    onEntryRequestSettled={settleNavigationRequest}
                  />
                </Suspense>
              </div>
            )}
          </RouteErrorBoundary>
        )}
      </main>
      {searchOpen && (
        <Suspense>
          <GlobalSearchDialog
            onClose={() => setSearchOpen(false)}
            onNavigate={handleSearchNavigate}
            invokerRef={searchTriggerRef}
          />
        </Suspense>
      )}
      {shortcutHelpOpen && (
        <Suspense>
          <ShortcutHelpDialog onClose={closeShortcutHelp} />
        </Suspense>
      )}
    </div>
  );
}
