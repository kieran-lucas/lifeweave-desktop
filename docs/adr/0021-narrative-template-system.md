# ADR 0021: Narrative Template System

Task 27 defines three static version-1 IDs: knowledge_dossier, project_blueprint, and learning_journey. Template identity is immutable creation provenance, not a structural lock; scene CRUD remains generic. Migration 15 is required because migration 12 only allowed Knowledge Dossier. The row and canonical JSON must agree on every save and draft. The inline chooser exists only before creation. Markdown import remains knowledge_dossier; there is no conversion, custom template, or Visual Worlds capability.
