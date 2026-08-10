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
import { FoundationScreen } from "../features/foundation/FoundationScreen";
import { TodayScreen } from "../features/task/today/TodayScreen";
import { CalendarScreen } from "../features/calendar/CalendarScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { CategoryGoals } from "../features/analytics/CategoryGoals";
import { LifeScreen } from "../features/life/LifeScreen";
import type { FocusPlanEntryRequest } from "../features/focus-plan/FocusPlansScreen";
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
import { ShortcutHelpDialog } from "./ShortcutHelpDialog";
import {
  analyticsShortcut,
  destinationShortcuts,
  resolveShortcutCommand,
  searchShortcut,
  shortcutHelpShortcut,
  type Destination,
  type DestinationShortcutCommand,
} from "./keyboardShortcuts";

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

type SidebarMode = "expanded" | "collapsed";
type SettingsView = "general" | "analytics";
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
  const [ipcStatus, setIpcStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [destination, setDestination] = useState<Destination>("today");
  const [settingsView, setSettingsView] = useState<SettingsView>("general");
  const [selectedDate, setSelectedDate] = useState(localToday);
  const anchorLocalDate = useLocalDateRollover();
  const previousAnchor = useRef(anchorLocalDate);
  const [taskSidebarMode, setTaskSidebarMode] =
    useState<SidebarMode>(readSidebarMode);
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

  const selectDestination = useCallback((next: Destination) => {
    setPendingNav(null);
    if (next === "today") setSelectedDate(anchorLocalDate);
    if (next === "settings") setSettingsView("general");
    setDestination(next);
  }, [anchorLocalDate]);

  const openSettingsAnalytics = useCallback(() => {
    setPendingNav(null);
    setDestination("settings");
    setSettingsView("analytics");
  }, []);

  const openSettingsSearch = useCallback(() => {
    setPendingNav(null);
    setDestination("settings");
    setSettingsView("general");
    setSearchOpen(true);
  }, []);

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
      setSelectedDate(anchorLocalDate);
    previousAnchor.current = anchorLocalDate;
  }, [anchorLocalDate, pendingTodayRequestId, selectedDate]);
  useEffect(() => {
    healthCheck()
      .then(() => setIpcStatus("ready"))
      .catch(() => setIpcStatus("error"));
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(preferenceKey, taskSidebarMode);
    } catch {
      /* storage is optional */
    }
  }, [taskSidebarMode]);
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
      setSelectedDate(target.local_date);
      setDestination("today");
    } else if (target.kind === "focus_plan") {
      setDestination("plans");
    } else {
      setDestination("life");
    }
    setPendingNav({ requestId, target });
  };
  const navigateToLifeNode = (nodeId: string) => {
    setDestination("life");
    setPendingNav({
      requestId: globalThis.crypto.randomUUID(),
      target: { kind: "life_browse", node_id: nodeId },
    });
  };
  const navigateToFocusPlan = (planId: string) => {
    setDestination("plans");
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
    setSelectedDate(localDate);
    setDestination("today");
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

  const collapsed = lifeAutoCollapsed || taskSidebarMode === "collapsed";
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
    setSelectedDate(date);
    setDestination("today");
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
      <main className={styles.viewport} data-app-viewport="">
        {ipcStatus === "loading" && (
          <p className={styles.coreStatus} aria-live="polite">
            Connecting to application core…
          </p>
        )}
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
                <CategoryGoals />
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
                  <FoundationScreen />
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
                    onClick={() => setSettingsView("general")}
                    aria-label="Back to Settings"
                  >
                    <Icon d={iconChevronLeft} size={18} />
                    Settings
                  </button>
                </PageFrame>
                <AnalyticsScreen onPlanNavigate={navigateToFocusPlan} />
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
                  onSelectedDateChange={setSelectedDate}
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
                <CalendarScreen
                  selectedDate={selectedDate}
                  today={localToday()}
                  onActivateDate={activateCalendarDate}
                />
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
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <LifeScreen
                  anchorLocalDate={anchorLocalDate}
                  onTaskNavigate={navigateToTask}
                  entryRequest={lifeEntryRequest}
                  onEntryRequestSettled={settleNavigationRequest}
                />
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
      {shortcutHelpOpen && <ShortcutHelpDialog onClose={closeShortcutHelp} />}
    </div>
  );
}
