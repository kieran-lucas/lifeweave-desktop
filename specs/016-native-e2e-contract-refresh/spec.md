# Specification

Use the isolated native profile across three driver sessions: create `E2E Alpha`, rename it to `E2E Beta`, back it up through Settings, rename it to `E2E Gamma`, restore the selected opaque backup ID, and verify `E2E Beta` survives a fresh native process. No raw IPC, product feature, schema, migration, dependency, or IPC contract change is allowed.
