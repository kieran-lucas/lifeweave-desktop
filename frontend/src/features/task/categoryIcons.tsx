export function CategoryIcon({ iconKey, label }: { iconKey: string; label: string }) {
  const glyph = iconKey === "category-general" ? "◉" : "◇";
  return <span aria-label={label} data-icon-key={iconKey}>{glyph}</span>;
}
