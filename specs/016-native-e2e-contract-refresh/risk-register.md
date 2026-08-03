# Risks

| Risk | Control |
| --- | --- |
| Stale UI selector | Derive semantic selectors from current components and run all phases. |
| Test binary lacks assets | Build the debug `e2e-test` binary through Tauri. |
| Cross-phase state leak | One contained profile, separate driver/process lifecycle per phase. |
| Restore only appears successful | Assert the durable restored Today state and fresh-process persistence. |
