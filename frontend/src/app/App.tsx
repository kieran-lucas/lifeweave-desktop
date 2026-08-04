import { Suspense, lazy, useEffect, useRef, useState } from "react";

import { healthCheck } from "../ipc/commands";
import { FoundationScreen } from "../features/foundation/FoundationScreen";
import { TodayScreen } from "../features/task/today/TodayScreen";
import { CalendarScreen } from "../features/calendar/CalendarScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { CategoryGoals } from "../features/analytics/CategoryGoals";
import { LifeScreen } from "../features/life/LifeScreen";
import { localToday } from "../features/calendar/date";
import type { SearchNavigationTarget } from "../ipc/generated/SearchNavigationTarget";
import * as styles from "./App.css";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const GlobalSearchDialog = lazy(
  () => import("../features/search/GlobalSearchDialog"),
);

type Destination = "today" | "calendar" | "analytics" | "life" | "settings";
type SidebarMode = "expanded" | "collapsed";
type SearchNavRequest = {
  requestId: string;
  target: SearchNavigationTarget;
} | null;
const preferenceKey = "lifeweave.task-sidebar-mode.v1";
const destinations: Array<{ id: Destination; label: string }> = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "analytics", label: "Analytics" },
  { id: "life", label: "Life System" },
  { id: "settings", label: "Settings" },
];

function readSidebarMode(): SidebarMode {
  try {
    const value = window.localStorage.getItem(preferenceKey);
    return value === "collapsed" ? "collapsed" : "expanded";
  } catch {
    return "expanded";
  }
}

export function App() {
  const [ipcStatus, setIpcStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [destination, setDestination] = useState<Destination>("today");
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [anchorLocalDate] = useState(localToday);
  const [taskSidebarMode, setTaskSidebarMode] =
    useState<SidebarMode>(readSidebarMode);
  const [lifeAutoCollapsed, setLifeAutoCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<SearchNavRequest>(null);
  const headingRef = useRef<HTMLElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

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
  }, [destination]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearchNavigate = (target: SearchNavigationTarget) => {
    const requestId = globalThis.crypto.randomUUID();
    if (target.kind === "today") {
      setSelectedDate(target.local_date);
      setDestination("today");
    } else {
      setDestination("life");
    }
    setPendingNav({ requestId, target });
  };
  const navigateToLifeNode = (nodeId: string) => {
    setDestination("life");
    setPendingNav({ requestId: globalThis.crypto.randomUUID(), target: { kind: "life_browse", node_id: nodeId } });
  };
  const navigateToTask = (localDate: string, taskId: string | null, seriesId: string | null) => {
    setSelectedDate(localDate);
    setDestination("today");
    setPendingNav({ requestId: globalThis.crypto.randomUUID(), target: { kind: "today", local_date: localDate, task_id: taskId, series_id: seriesId, original_local_date: null } });
  };

  const collapsed = lifeAutoCollapsed || taskSidebarMode === "collapsed";
  const selectDestination = (next: Destination) => setDestination(next);
  const activateCalendarDate = (date: string) => {
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
        <div className={styles.brand}>Lifeweave</div>
        <div className={styles.navGroup}>
          {destinations.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.navButton}
              onClick={() => selectDestination(item.id)}
              aria-current={destination === item.id ? "page" : undefined}
              aria-label={item.label}
            >
              <span aria-hidden="true" className={styles.navIcon}>
                {item.label.slice(0, 1)}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.navButton}
            onClick={() => selectDestination("life")}
            aria-current={destination === "life" ? "page" : undefined}
            aria-label="Life System"
          >
            <span aria-hidden="true" className={styles.navIcon}>
              L
            </span>
            <span className={styles.navLabel}>Life System</span>
          </button>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.navButton}
            onClick={() => selectDestination("settings")}
            aria-current={destination === "settings" ? "page" : undefined}
            aria-label="Settings"
          >
            <span aria-hidden="true" className={styles.navIcon}>
              S
            </span>
            <span className={styles.navLabel}>Settings</span>
          </button>
          <div className={styles.divider} />
          <button
            ref={searchTriggerRef}
            type="button"
            className={styles.navButton}
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Ctrl+K)"
          >
            <span aria-hidden="true" className={styles.navIcon}>
              ⌕
            </span>
            <span className={styles.navLabel}>Search</span>
          </button>
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
          {collapsed ? "→" : "←"}
          <span className={styles.navLabel}>
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </button>
      </nav>
      <main className={styles.viewport}>
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
            {destination === "settings" && (
              <section
                ref={headingRef}
                className={styles.destination}
                aria-labelledby="settings-heading"
              >
                <h1
                  id="settings-heading"
                  tabIndex={-1}
                  className={styles.heading}
                >
                  Settings
                </h1>
                <p className={styles.lede}>
                  Application preferences and foundation verification tools.
                </p>
                <CategoryGoals />
                <div className={styles.foundationPanel}>
                  <h2>Foundation tools</h2>
                  <p>
                    Development-only backup and FoundationRecord verification.
                  </p>
                  <FoundationScreen />
                </div>
              </section>
            )}
            {destination === "today" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <TodayScreen
                  selectedDate={selectedDate}
                  onSelectedDateChange={setSelectedDate}
                  onLifeNavigate={navigateToLifeNode}
                  focusRequest={
                    pendingNav?.target.kind === "today"
                      ? {
                          requestId: pendingNav.requestId,
                          taskId: pendingNav.target.task_id,
                          seriesId: pendingNav.target.series_id,
                        }
                      : null
                  }
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
            {destination === "analytics" && (
              <div
                ref={(node) => {
                  headingRef.current = node;
                }}
              >
                <AnalyticsScreen />
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
                  entryRequest={
                    pendingNav?.target.kind === "life_browse" ||
                    pendingNav?.target.kind === "life_reader"
                      ? {
                          requestId: pendingNav.requestId,
                          nodeId: pendingNav.target.node_id,
                          mode:
                            pendingNav.target.kind === "life_reader"
                              ? "reader"
                              : "browse",
                        }
                      : null
                  }
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
    </div>
  );
}
