import type { Destination } from "./keyboardShortcuts";
import type { FocusPlanPortfolio } from "../ipc/generated/FocusPlanPortfolio";

export type SettingsView = "general" | "analytics";

export type PlansHistoryView = {
  portfolio: FocusPlanPortfolio;
  planId: string | null;
};

export type LifeHistoryView = {
  mode: "browse" | "tree" | "reader";
  nodeId: string | null;
  readerId: string | null;
  page: number;
};

export type AppHistoryRoute = {
  destination: Destination;
  settingsView: SettingsView;
  selectedDate: string;
  plansView: PlansHistoryView;
  lifeView: LifeHistoryView;
};

type StoredAppHistoryRouteV2 = AppHistoryRoute & {
  lifeweaveRouteVersion: 2;
  lifeweaveHistoryIndex: number;
};

type StoredAppHistoryCandidate = {
  lifeweaveRouteVersion?: unknown;
  lifeweaveHistoryIndex?: unknown;
  destination?: unknown;
  settingsView?: unknown;
  selectedDate?: unknown;
  plansView?: unknown;
  lifeView?: unknown;
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
const planPortfolios = new Set<FocusPlanPortfolio>([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
export const defaultPlansHistoryView: PlansHistoryView = {
  portfolio: "active",
  planId: null,
};
export const defaultLifeHistoryView: LifeHistoryView = {
  mode: "browse",
  nodeId: null,
  readerId: null,
  page: 0,
};

function storedRoute(route: AppHistoryRoute, index: number): StoredAppHistoryRouteV2 {
  return { lifeweaveRouteVersion: 2, lifeweaveHistoryIndex: index, ...route };
}

/** Reads only states created by Lifeweave; unrelated WebView history entries are never trusted. */
export function readAppHistoryEntry(value: unknown): AppHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as StoredAppHistoryCandidate;
  if (candidate.lifeweaveRouteVersion !== 1 && candidate.lifeweaveRouteVersion !== 2) return null;
  const index = candidate.lifeweaveHistoryIndex;
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
    return null;
  if (!destinations.has(candidate.destination as Destination)) return null;
  if (!settingsViews.has(candidate.settingsView as SettingsView)) return null;
  if (
    typeof candidate.selectedDate !== "string" ||
    !localDatePattern.test(candidate.selectedDate)
  ) return null;
  const plansView = candidate.lifeweaveRouteVersion === 1
    ? defaultPlansHistoryView
    : readPlansHistoryView(candidate.plansView);
  if (!plansView) return null;
  const lifeView = candidate.lifeweaveRouteVersion === 1 || candidate.lifeView === undefined
    ? defaultLifeHistoryView
    : readLifeHistoryView(candidate.lifeView);
  if (!lifeView) return null;
  return {
    index,
    route: {
      destination: candidate.destination as Destination,
      settingsView: candidate.settingsView as SettingsView,
      selectedDate: candidate.selectedDate,
      plansView,
      lifeView,
    },
  };
}

function validHistoryId(value: unknown): value is string | null {
  return value === null || (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function readPlansHistoryView(value: unknown): PlansHistoryView | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PlansHistoryView>;
  if (!planPortfolios.has(candidate.portfolio as FocusPlanPortfolio)) return null;
  if (!validHistoryId(candidate.planId)) return null;
  return {
    portfolio: candidate.portfolio as FocusPlanPortfolio,
    planId: candidate.planId,
  };
}

function readLifeHistoryView(value: unknown): LifeHistoryView | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LifeHistoryView>;
  if (candidate.mode !== "browse" && candidate.mode !== "tree" && candidate.mode !== "reader") return null;
  if (!validHistoryId(candidate.nodeId) || !validHistoryId(candidate.readerId)) return null;
  if (typeof candidate.page !== "number" || !Number.isSafeInteger(candidate.page) || candidate.page < 0 || candidate.page > 10_000) return null;
  if (candidate.mode === "reader" && candidate.readerId === null) return null;
  if (candidate.mode !== "reader" && candidate.readerId !== null) return null;
  return {
    mode: candidate.mode,
    nodeId: candidate.nodeId,
    readerId: candidate.readerId,
    page: candidate.page,
  };
}

export function readAppHistoryRoute(value: unknown): AppHistoryRoute | null {
  return readAppHistoryEntry(value)?.route ?? null;
}

export function sameAppHistoryRoute(left: AppHistoryRoute, right: AppHistoryRoute): boolean {
  const sameBase = left.destination === right.destination &&
    left.settingsView === right.settingsView &&
    left.selectedDate === right.selectedDate;
  if (!sameBase) return false;
  if (left.destination === "plans") {
    return left.plansView.portfolio === right.plansView.portfolio &&
      left.plansView.planId === right.plansView.planId;
  }
  if (left.destination === "life") {
    return left.lifeView.mode === right.lifeView.mode &&
      left.lifeView.nodeId === right.lifeView.nodeId &&
      left.lifeView.readerId === right.lifeView.readerId &&
      left.lifeView.page === right.lifeView.page;
  }
  return true;
}

/** Identifies the mounted screen boundary without treating in-page Today date changes as screens. */
export function appHistoryScreenKey(route: AppHistoryRoute): string {
  if (route.destination === "plans") {
    return `plans:${route.plansView.portfolio}:${route.plansView.planId ?? "overview"}`;
  }
  if (route.destination === "settings") return `settings:${route.settingsView}`;
  if (route.destination === "life") {
    return `life:${route.lifeView.mode}:${route.lifeView.nodeId ?? "remembered"}:${route.lifeView.readerId ?? "none"}:${route.lifeView.page}`;
  }
  return route.destination;
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
