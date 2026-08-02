# Core RC dogfood report

- Candidate: `core-rc-44ba9c5` (implementation commit).
- Sentinel-contained run: `target/e2e-data/core-rc-a792a39d8a4b471caa5937e4ddd68163` (removed after validation).
- Native session root PIDs: 12544, 19468; each remained alive 25 seconds and reopened the same schema-9 profile.
- Document recovery/assets/Markdown authority: 14 focused tests passed.
- Complete backup/restore/recovery authority: 136 focused tests passed, including latest documents/assets/Life/Task/Analytics data.
- Installer: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,459,528 bytes, SHA-256 `c8d170e3261614c7c05623ac97606ce4464f69dcb171b47369f7dd559d5aad3a`.
- Release binary: 12,102,656 bytes, SHA-256 `04d22b607b585f05f67af2fc7b625fd6aafa6aa45e831c4b016334c40d52e363`.
- Cleanup: exact owned process trees stopped; sentinel/direct-parent validation preceded profile removal; no normal AppData was used.

The first harness run found a process-exit observation race; its synthetic profile was retained, the PID was confirmed stopped, cleanup polling was corrected, and that profile was sentinel-validated before removal. The final run passed. Native WebDriver DOM attachment was not retried because the stack has not materially changed; frontend interaction tests plus native liveness/file-backed recovery remain the truthful evidence boundary.
