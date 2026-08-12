import { describe, expect, it } from "vitest";

import appSource from "./App.tsx?raw";
import todaySource from "../features/task/today/TodayScreen.tsx?raw";
import weekSource from "../features/calendar/WeekStrip.tsx?raw";
import dateSource from "../features/calendar/date.ts?raw";

describe("Today startup import boundary", () => {
  it("keeps non-default routes and secondary dialogs behind React.lazy", () => {
    for (const moduleName of [
      "FoundationScreen",
      "CalendarScreen",
      "AnalyticsScreen",
      "CategoryGoals",
      "LifeScreen",
      "ShortcutHelpDialog",
    ]) {
      expect(appSource).toContain(`const ${moduleName} = lazy(`);
      expect(appSource).not.toMatch(new RegExp(`import\\s+\\{\\s*${moduleName}\\s*\\}`));
    }
  });

  it("defers composer-only relation and tag controls", () => {
    for (const moduleName of ["LifeAreaCombobox", "FocusPlanCombobox", "TagPicker"]) {
      expect(todaySource).toContain(`const ${moduleName} = lazy(`);
      expect(todaySource).not.toMatch(new RegExp(`import\\s+\\{\\s*${moduleName}\\s*\\}`));
    }
  });

  it("keeps the internationalized calendar engine out of the Today startup graph", () => {
    for (const source of [appSource, todaySource, weekSource, dateSource]) {
      expect(source).not.toContain('@internationalized/date');
    }
  });

  it("mounts Today before the advisory health probe settles", () => {
    expect(appSource).toContain('useState<"ready" | "error">("ready")');
    expect(appSource).toContain("requestAnimationFrame(() => {");
    expect(appSource).not.toContain('ipcStatus === "loading"');
  });
});
