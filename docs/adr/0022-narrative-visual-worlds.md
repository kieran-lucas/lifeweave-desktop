# ADR 0022: Narrative Visual Worlds

Visual worlds are document-level mutable presentation stored solely as canonical visualWorldId. Missing legacy values mean Paper. Four static IDs are Paper, Sakura, Aurora, and Nocturne. They are independent from templates, use scoped static CSS, honor dark/forced-colors authority, and do not add a database column, migration, custom palette, layout, motion, external asset, or Markdown metadata.
