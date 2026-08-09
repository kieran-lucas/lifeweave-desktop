/**
 * Task 51 prototype fixtures.
 *
 * Deliberately **not** ideal demo text (spec §17). Task 50 found several semantic-spacing failures
 * that only appeared with real combinations, so the dense fixture below carries a long title, long
 * Vietnamese text with stacked diacritics, a row with every metadata facet at once, and a running
 * timer.
 *
 * These shapes mirror the real `TodayItem` projection closely enough to prove composition, but this
 * is a fixture, not the DTO: the prototype never calls IPC and never imports a feature module.
 */

export type Period = "morning" | "afternoon" | "evening";

export type PrototypeTask = {
  id: string;
  title: string;
  /** Minutes from local midnight. Formatted by the prototype, never pre-formatted here. */
  startMinute: number;
  endMinute: number;
  /** Lifeweave has completion *states*, not a boolean; `null` means not yet evaluated. */
  evaluation: "completed" | "partial" | "missed" | null;
  priority: "normal" | "high";
  category: string;
  lifeArea?: string;
  focusPlan?: string;
  deadline?: { date: string; state: "upcoming" | "due_today" | "overdue" };
  recurring?: boolean;
  tags?: string[];
  /** Seconds already recorded, and whether a session is running now. */
  actualTime?: { totalSeconds: number; running: boolean };
  note?: string;
};

export const periods: { id: Period; name: string; start: number; end: number }[] = [
  // The semantic boundaries are product invariants and are not adjustable by Task 51.
  { id: "morning", name: "Morning", start: 4 * 60, end: 12 * 60 },
  { id: "afternoon", name: "Afternoon", start: 12 * 60, end: 18 * 60 },
  { id: "evening", name: "Evening", start: 18 * 60, end: 24 * 60 },
];

export const populated: PrototypeTask[] = [
  {
    id: "t1",
    title: "Morning routine",
    startMinute: 6 * 60 + 30,
    endMinute: 7 * 60,
    evaluation: "completed",
    priority: "normal",
    category: "Health",
  },
  {
    id: "t2",
    title: "Plan the day",
    startMinute: 7 * 60,
    endMinute: 7 * 60 + 30,
    evaluation: null,
    priority: "normal",
    category: "General",
  },
  {
    id: "t3",
    title: "Deep work: Lifeweave project",
    startMinute: 9 * 60,
    endMinute: 11 * 60 + 30,
    evaluation: null,
    priority: "high",
    category: "Work",
    lifeArea: "Creative Expression",
    focusPlan: "Ship the visual overhaul",
    tags: ["deep-work", "lifeweave"],
    actualTime: { totalSeconds: 47 * 60, running: false },
    note:
      "Continue refining the core experience around the Life System and daily planning flow. " +
      "Focus on clarity, calm, and a sense of quiet momentum.",
  },
  {
    id: "t4",
    title: "Write weekly reflection",
    startMinute: 10 * 60 + 30,
    endMinute: 11 * 60,
    evaluation: null,
    priority: "normal",
    category: "General",
    recurring: true,
  },
  {
    id: "t5",
    title: "Inbox zero",
    startMinute: 11 * 60 + 15,
    endMinute: 11 * 60 + 45,
    evaluation: "partial",
    priority: "normal",
    category: "Work",
  },
  {
    id: "t6",
    title: "Lunch & reset",
    startMinute: 12 * 60,
    endMinute: 12 * 60 + 45,
    evaluation: "completed",
    priority: "normal",
    category: "Health",
  },
  {
    id: "t7",
    title: "Stakeholder check-in",
    startMinute: 13 * 60,
    endMinute: 13 * 60 + 30,
    evaluation: null,
    priority: "high",
    category: "Work",
    focusPlan: "Ship the visual overhaul",
  },
  {
    id: "t8",
    title: "Design review",
    startMinute: 14 * 60 + 30,
    endMinute: 15 * 60 + 30,
    evaluation: null,
    priority: "high",
    category: "Work",
    deadline: { date: "2026-08-08", state: "due_today" },
  },
  {
    id: "t9",
    title: "Admin block",
    startMinute: 16 * 60,
    endMinute: 16 * 60 + 45,
    evaluation: null,
    priority: "normal",
    category: "General",
  },
  {
    id: "t10",
    title: "Exercise",
    startMinute: 17 * 60 + 30,
    endMinute: 18 * 60 + 15,
    evaluation: null,
    priority: "normal",
    category: "Health",
    recurring: true,
  },
  {
    id: "t11",
    title: "Read: Notes on Creativity",
    startMinute: 19 * 60,
    endMinute: 19 * 60 + 45,
    evaluation: null,
    priority: "normal",
    category: "Learning",
    lifeArea: "Learning & Growth",
  },
  {
    id: "t12",
    title: "Plan tomorrow",
    startMinute: 21 * 60,
    endMinute: 21 * 60 + 20,
    evaluation: null,
    priority: "normal",
    category: "General",
  },
];

/**
 * The stress set (spec §17). Every row here exists because some combination of long text, many
 * facets or unusual state has broken a Lifeweave layout before.
 */
export const dense: PrototypeTask[] = [
  ...populated.slice(0, 3),
  {
    id: "s1",
    title: "Quarterly cross-functional retrospective synthesis and follow-up commitments review",
    startMinute: 8 * 60,
    endMinute: 9 * 60 + 30,
    evaluation: null,
    priority: "high",
    category: "Work",
    lifeArea: "Impact & Contribution",
    focusPlan: "Rebuild the household documentation system end to end before the winter move",
    deadline: { date: "2026-08-06", state: "overdue" },
    recurring: true,
    tags: ["retrospective", "cross-functional", "long-running-preparation-and-review"],
    actualTime: { totalSeconds: 2 * 3600 + 14 * 60, running: true },
  },
  {
    id: "s2",
    title: "Chuẩn bị tài liệu hướng dẫn sử dụng hệ thống quản lý đời sống cá nhân",
    startMinute: 9 * 60 + 45,
    endMinute: 10 * 60 + 30,
    evaluation: null,
    priority: "normal",
    category: "Learning",
    lifeArea: "Học tập & Phát triển",
    tags: ["tiếng-việt", "tài-liệu"],
  },
  {
    id: "s3",
    title: "Missed: submit expense report",
    startMinute: 11 * 60,
    endMinute: 11 * 60 + 15,
    evaluation: "missed",
    priority: "normal",
    category: "Admin",
    deadline: { date: "2026-08-07", state: "overdue" },
  },
  ...populated.slice(5),
];

/** The Life System preview graph in the inspector. Pastel nodes, thin connectors, no colour-coding. */
export const lifePreview = {
  focus: "Lifeweave Project",
  nodes: [
    { id: "creative", label: "Creative Expression", tone: "cream", x: 50, y: 8 },
    { id: "learning", label: "Learning & Growth", tone: "mint", x: 10, y: 40 },
    { id: "impact", label: "Impact & Contribution", tone: "blue", x: 90, y: 40 },
    { id: "focus", label: "Lifeweave Project", tone: "lavender", x: 50, y: 46 },
    { id: "health", label: "Health & Energy", tone: "mint", x: 26, y: 82 },
    { id: "relationships", label: "Relationships", tone: "peach", x: 74, y: 82 },
  ],
  edges: [
    ["focus", "creative"],
    ["focus", "learning"],
    ["focus", "impact"],
    ["focus", "health"],
    ["focus", "relationships"],
  ],
} as const;

export function formatTime(minute: number): string {
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function periodOf(task: PrototypeTask): Period {
  const hour = Math.floor(task.startMinute / 60);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
