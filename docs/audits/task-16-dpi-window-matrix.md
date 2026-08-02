# Task 16 DPI and window matrix

The measured local display was 1920×1080 at 96 DPI (100%). The production minimum remains 960×640; it is enforced by `tauri.conf.json` and verified by the hardening gate. CSS owns one root/destination scroll boundary, uses responsive grids/container rules, and persists no pixel coordinates.

| Matrix | Evidence | Result |
|---|---|---|
| 100%, 1920×1080 native | two contained native sessions | pass |
| 960×640 contract | Tauri config + responsive component tests | pass |
| 125/150/175/200% | scalable CSS, 200% semantic/layout tests and no fixed persisted geometry | deterministic evidence only |
| forced colors | explicit system-color token override + route semantics | deterministic evidence only |
| reduced motion | global reduction plus widget tests | pass |

Alternate DPI, multi-monitor movement and screenshot comparison were unavailable on this single-monitor machine and are not claimed as manual native passes.
