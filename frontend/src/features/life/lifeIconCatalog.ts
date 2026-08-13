export type LifeIconOption = {
  key: string;
  glyph: string;
  label: string;
};

/**
 * Stable semantic icon keys for the canonical Life Focus System.
 *
 * The glyph is presentation only; the key remains portable and readable in exported metadata.
 * Legacy generic keys intentionally fall back to the existing vector icons.
 */
export const LIFE_ICON_OPTIONS: readonly LifeIconOption[] = [
  { key: "life-system", glyph: "🧭", label: "Life Focus System" },
  { key: "life-vitality", glyph: "⚡", label: "Vitality" },
  { key: "life-body", glyph: "💪", label: "Body" },
  { key: "life-sleep", glyph: "😴", label: "Sleep and recovery" },
  { key: "life-fitness", glyph: "🏃", label: "Movement and fitness" },
  { key: "life-nutrition", glyph: "🥗", label: "Nutrition and healthcare" },
  { key: "life-mind", glyph: "🧠", label: "Mind" },
  { key: "life-emotional", glyph: "💚", label: "Emotional wellbeing" },
  { key: "life-stress", glyph: "🌿", label: "Stress and coping" },
  { key: "life-mental-health", glyph: "🫶", label: "Mental healthcare" },
  { key: "life-rest-play", glyph: "🎮", label: "Rest and play" },
  { key: "life-detachment", glyph: "🔌", label: "Detachment and downtime" },
  { key: "life-entertainment", glyph: "🎬", label: "Play and entertainment" },
  { key: "life-hobbies", glyph: "🧩", label: "Hobbies and exploration" },
  { key: "life-capability", glyph: "🎯", label: "Capability and contribution" },
  { key: "life-learning", glyph: "🎓", label: "Learning" },
  { key: "life-formal-learning", glyph: "📚", label: "Formal learning" },
  { key: "life-domain-knowledge", glyph: "🧠", label: "Domain knowledge" },
  { key: "life-language", glyph: "🗣️", label: "Language and communication" },
  { key: "life-craft", glyph: "🛠️", label: "Craft" },
  { key: "life-technical", glyph: "💻", label: "Technical practice" },
  { key: "life-research", glyph: "🔬", label: "Research and inquiry" },
  { key: "life-projects", glyph: "🧰", label: "Projects and portfolio" },
  { key: "life-work", glyph: "💼", label: "Work and contribution" },
  { key: "life-career", glyph: "🧭", label: "Career pathways" },
  { key: "life-performance", glyph: "⚙️", label: "Professional performance" },
  { key: "life-leadership", glyph: "🌟", label: "Leadership and impact" },
  { key: "life-relationships", glyph: "🤝", label: "Relationships" },
  { key: "life-family", glyph: "❤️", label: "Family and love" },
  { key: "life-parents", glyph: "👪", label: "Parents and family of origin" },
  { key: "life-partner", glyph: "💞", label: "Partner and marriage" },
  { key: "life-children", glyph: "👨‍👩‍👧", label: "Children and household" },
  { key: "life-friends-mentors", glyph: "🫂", label: "Friends and mentors" },
  { key: "life-close-friends", glyph: "🫂", label: "Close friends" },
  { key: "life-peers", glyph: "🤝", label: "Peers and collaborators" },
  { key: "life-mentors", glyph: "🧑‍🏫", label: "Mentors and mentees" },
  { key: "life-community", glyph: "🌐", label: "Community" },
  { key: "life-academic-community", glyph: "🏫", label: "Academic and professional communities" },
  { key: "life-civic", glyph: "🏛️", label: "Local and civic community" },
  { key: "life-belonging", glyph: "🫶", label: "Membership and belonging" },
  { key: "life-security", glyph: "🛡️", label: "Security" },
  { key: "life-finance", glyph: "💰", label: "Finance" },
  { key: "life-cash-flow", glyph: "💵", label: "Cash flow and buffer" },
  { key: "life-investing", glyph: "📈", label: "Investing and growth" },
  { key: "life-insurance", glyph: "📋", label: "Insurance and obligations" },
  { key: "life-home", glyph: "🏡", label: "Home and environment" },
  { key: "life-housing", glyph: "🏠", label: "Housing" },
  { key: "life-location", glyph: "📍", label: "Location and mobility" },
  { key: "life-living-environment", glyph: "🪴", label: "Living environment" },
  { key: "life-safety", glyph: "🛡️", label: "Safety and continuity" },
  { key: "life-digital-safety", glyph: "🔐", label: "Personal and digital safety" },
  { key: "life-documents", glyph: "🗂️", label: "Documents and administration" },
  { key: "life-contingency", glyph: "🛟", label: "Contingency and recovery" },
] as const;

const glyphByKey = new Map(LIFE_ICON_OPTIONS.map(({ key, glyph }) => [key, glyph]));

export function lifeIconGlyph(key: string): string | undefined {
  return glyphByKey.get(key);
}
