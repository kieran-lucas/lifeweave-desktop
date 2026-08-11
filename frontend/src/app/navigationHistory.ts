import type { Destination } from "./keyboardShortcuts";

export type SettingsView = "general" | "analytics";

export type AppHistoryRoute = {
  destination: Destination;
  settingsView: SettingsView;
  selectedDate: string;
};

type StoredAppHistoryRoute = AppHistoryRoute & {
  lifeweaveRouteVersion: 1;
  lifeweaveHistoryIndex: number;
};

export type AppHistoryEntry = {
  route: AppHistoryRoute;
  index: number;
};

const destinations = new Set<Destination>([
  "today",
  "calendar",
  "plans",
  "life",
  "settings",
]);
const settingsViews = new Set<SettingsView>(["general", "analytics"]);
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function storedRoute(route: AppHistoryRoute, index: number): StoredAppHistoryRoute {
  return { lifeweaveRouteVersion: 1, lifeweaveHistoryIndex: index, ...route };
}

/** Reads only states created by Lifeweave; unrelated WebView history entries are never trusted. */
export function readAppHistoryEntry(value: unknown): AppHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredAppHistoryRoute>;
  if (candidate.lifeweaveRouteVersion !== 1) return null;
  const index = candidate.lifeweaveHistoryIndex;
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
    return null;
  if (!destinations.has(candidate.destination as Destination)) return null;
  if (!settingsViews.has(candidate.settingsView as SettingsView)) return null;
  if (
    typeof candidate.selectedDate !== "string" ||
    !localDatePattern.test(candidate.selectedDate)
  ) return null;
  return {
    index,
    route: {
      destination: candidate.destination as Destination,
      settingsView: candidate.settingsView as SettingsView,
      selectedDate: candidate.selectedDate,
    },
  };
}

export function readAppHistoryRoute(value: unknown): AppHistoryRoute | null {
  return readAppHistoryEntry(value)?.route ?? null;
}

export function sameAppHistoryRoute(left: AppHistoryRoute, right: AppHistoryRoute): boolean {
  return left.destination === right.destination &&
    left.settingsView === right.settingsView &&
    left.selectedDate === right.selectedDate;
}

export function replaceAppHistoryRoute(
  history: History,
  route: AppHistoryRoute,
  index = 0,
): void {
  history.replaceState(storedRoute(route, index), "");
}

export function pushAppHistoryRoute(history: History, route: AppHistoryRoute, index: number): void {
  history.pushState(storedRoute(route, index), "");
}
