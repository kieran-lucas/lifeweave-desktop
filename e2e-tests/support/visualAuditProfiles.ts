export const visualAuditGroups = [
  "shell-task",
  "calendar-analytics-plans",
  "life-reader-interchange",
  "narrative",
  "settings",
] as const;

export type VisualAuditGroup = (typeof visualAuditGroups)[number];
export type VisualAuditProfile = VisualAuditGroup | "foundation" | "full";

const profiles: Record<VisualAuditProfile, readonly VisualAuditGroup[]> = {
  "shell-task": ["shell-task"],
  "calendar-analytics-plans": ["calendar-analytics-plans"],
  "life-reader-interchange": ["life-reader-interchange"],
  narrative: ["narrative"],
  settings: ["settings"],
  foundation: [
    "shell-task",
    "calendar-analytics-plans",
    "life-reader-interchange",
    "settings",
  ],
  full: visualAuditGroups,
};

export function requestedVisualAuditProfile(value = process.env.LIFEWEAVE_AUDIT_PROFILE): VisualAuditProfile {
  const profile = value || "full";
  if (!(profile in profiles)) {
    throw new Error(
      `Unsupported LIFEWEAVE_AUDIT_PROFILE: ${profile}. Expected ${Object.keys(profiles).join(", ")}`,
    );
  }
  return profile as VisualAuditProfile;
}

export function profileIncludes(profile: VisualAuditProfile, group: VisualAuditGroup): boolean {
  return profiles[profile].includes(group);
}

export function profileGroups(profile: VisualAuditProfile): readonly VisualAuditGroup[] {
  return profiles[profile];
}
