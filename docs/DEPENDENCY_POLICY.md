# Dependency Policy

## Admission checklist

A new dependency requires a pull-request note covering:

- feature/spec that requires it;
- why platform/native code is insufficient;
- alternatives evaluated;
- maintenance activity;
- license;
- security/advisory posture;
- bundle/binary impact;
- runtime/network behavior;
- accessibility implications;
- data format lock-in;
- removal/migration cost.

## Rules

- No dependency for an OPEN or DEFERRED feature.
- No duplicate libraries controlling the same widget/focus behavior.
- No default component appearance may ship un-restyled.
- No runtime plugin marketplace or remote code.
- No remote font/icon/background/CDN.
- No ORM unless a future ADR overturns handwritten repositories.
- No animation library may become permission to animate everything.
- No chart library until CSS/SVG primitives become insufficient in a prototype.
- No ML framework before a transparent heuristic baseline is measured.
- No broad filesystem or shell plugin.

## Upgrade policy

- Small batches.
- Lockfiles committed.
- Review release notes and advisories.
- Run all relevant tests/builds.
- Compare screenshots and performance for UI/runtime changes.
- Never edit old migration files to satisfy an upgrade.
- Keep a rollback commit/branch for major changes.

## Removal policy

Remove a dependency when:
- its feature is removed/deferred indefinitely;
- native APIs now cover the use;
- it forces unsafe permissions;
- it blocks supported toolchain upgrades;
- measured cost exceeds value.

A removal must include data/schema migration when applicable.
