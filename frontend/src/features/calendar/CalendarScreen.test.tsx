import { expect, it } from "vitest";

import type { CalendarDayProjection } from "../../ipc/generated/CalendarDayProjection";
import { calendarTaskLabel } from "./CalendarScreen";

const day: CalendarDayProjection = {
  date: "2026-08-13",
  is_today: false,
  is_selected: false,
  task_count: 5,
  completed_task_count: 3,
  scheduled_minutes: 240,
  category_icon_keys: [],
  extra_category_count: 0,
  morning_load_ratio: 0,
  afternoon_load_ratio: 0,
  evening_load_ratio: 0,
  has_missed: true,
};

it("uses compact task and past-day completion labels", () => {
  expect(calendarTaskLabel(day, false)).toBe("5 tasks");
  expect(calendarTaskLabel(day, true)).toBe("3/5 done");
  expect(calendarTaskLabel({ ...day, task_count: 1 }, false)).toBe("1 task");
});
