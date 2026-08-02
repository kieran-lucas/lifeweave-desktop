# Task 16 performance baseline

Machine: Windows 11 10.0.26200, Intel i3-1115G4, 7.8 GiB RAM, Intel UHD, 1920×1080 at measured 96 DPI.

| Production asset | Task 15 baseline | Task 16 | gate |
|---|---:|---:|---:|
| main JS | 484,253 B | 484,985 B | 535,000 B |
| lazy Basic Leaf editor | 442,791 B | 442,791 B | 490,000 B |
| lazy Markdown adapter | 116,541 B | 116,541 B | 129,000 B |
| all JS chunks | 1,044,464 B | 1,045,196 B | 1,150,000 B |

The main-chunk change is +0.15%. `scripts/check_performance_budgets.py` uses the recorded baseline and approximately 10% regression ceiling. Vite transformed 794 modules and built in 1.23–1.32 s on repeated final runs. The full Rust suite completed in 6.68 s after compilation; Life's 100/500/2,000-node fixture stayed green. The RC harness proved two 25-second native liveness periods. It does not claim an instrumented startup-to-interactive or memory benchmark because no trustworthy WebView instrumentation was available.
