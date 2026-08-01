# Source integrity contract

The file [`SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`](./SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md) is the exact source supplied by the Product Owner.

## Verified fingerprint

- Bytes: **165,171**
- Lines: **4,637**
- SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- Copy rule: byte-for-byte; no formatting, normalization, translation, or correction.
- Git rule: `.gitattributes` marks the file `-text` so Git does not rewrite line endings.

## Authority order

1. The exact source file.
2. Explicit later Product Owner decisions, recorded by ADR/decision log.
3. Approved Core Product Spec.
4. Feature specs and acceptance criteria.
5. Implementation.

Derived summaries and setup documents are navigational aids. They do not silently replace, reconcile, or “improve” the original.

## Verification

Run:

```powershell
python scripts/verify_source_integrity.py
python scripts/generate_spec_index.py --check
python scripts/generate_coverage_matrix.py --check
```

CI runs the same checks. Any checksum mismatch is a release-blocking failure.
