# SQLite Revision Boundary

External Focus Plan DTOs expose revisions as non-negative `u64`. SQLite stores
signed INTEGER values, and `rusqlite` intentionally has no direct `u64`
`ToSql`/`FromSql` implementation. Task 36 therefore validates every incoming
revision with `u32::try_from`, uses `u32` at the SQLite boundary, and converts
back with `u64::from`. Values outside the supported range fail validation rather
than truncating or wrapping.
