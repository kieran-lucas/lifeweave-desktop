export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function tagLabel(count: number) {
  return count === 0 ? "No tags" : `${count} ${pluralize(count, "tag")}`;
}
