// Fair pre-validation layer for Strategy B.
// Validates and migrates raw JSON before passing to nodeFromJSON.
// This prevents silent data loss by catching schema mismatches early.

export type RawNarrativeJson = {
  type: "doc";
  attrs: {
    documentId: string;
    title: string;
    templateId: string;
    schemaVersion: number;
    [k: string]: unknown;
  };
  content: unknown[];
};

export type CodecResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validates that `raw` is a valid RawNarrativeJson structure.
 * Checks: is object, type === "doc", has attrs with required fields, content is array.
 */
export function validateRawJson(raw: unknown): CodecResult<RawNarrativeJson> {
  if (!isObject(raw)) {
    return { ok: false, error: "Expected an object at root" };
  }

  if (raw["type"] !== "doc") {
    return { ok: false, error: `Expected type "doc", got: ${String(raw["type"])}` };
  }

  const attrs = raw["attrs"];
  if (!isObject(attrs)) {
    return { ok: false, error: "Missing or invalid attrs object" };
  }

  if (typeof attrs["documentId"] !== "string") {
    return { ok: false, error: "attrs.documentId must be a string" };
  }

  if (typeof attrs["title"] !== "string") {
    return { ok: false, error: "attrs.title must be a string" };
  }

  if (typeof attrs["templateId"] !== "string") {
    return { ok: false, error: "attrs.templateId must be a string" };
  }

  if (typeof attrs["schemaVersion"] !== "number") {
    return { ok: false, error: "attrs.schemaVersion must be a number" };
  }

  if (!Array.isArray(raw["content"])) {
    return { ok: false, error: "content must be an array" };
  }

  return { ok: true, value: raw as RawNarrativeJson };
}

/**
 * Migrates a validated RawNarrativeJson to a target schema version.
 *
 * v1 → v2: adds `narrativeType: "story"` to doc attrs, sets schemaVersion: 2.
 * This migration is done BEFORE nodeFromJSON to avoid silent data loss.
 */
export function migrateJson(
  json: RawNarrativeJson,
  targetVersion: number,
): CodecResult<RawNarrativeJson> {
  let current = json;

  while (current.attrs.schemaVersion < targetVersion) {
    const fromVersion = current.attrs.schemaVersion;

    if (fromVersion === 1) {
      // v1 → v2: add narrativeType to doc attrs
      current = {
        ...current,
        attrs: {
          ...current.attrs,
          narrativeType: "story",
          schemaVersion: 2,
        },
      };
    } else {
      return {
        ok: false,
        error: `No migration path from version ${fromVersion} to ${targetVersion}`,
      };
    }
  }

  return { ok: true, value: current };
}
