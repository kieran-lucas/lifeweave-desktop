# Lifeweave application icon

The packaged PNG and ICO files in this directory are generated from
`assets/brand/lifeweave-app-icon.svg`.

The application icon uses a solid black rounded-square field with the same continuous white infinity
geometry used by the shell identity, so Windows taskbar/start-menu rendering keeps a clear silhouette
at small sizes.

`assets/brand/lifeweave-mark.svg` remains the transparent shell/glyph source used by the generated
frontend icon module.

Regenerate raster bundle files from the canonical SVG source; do not redraw individual PNG/ICO sizes independently.
