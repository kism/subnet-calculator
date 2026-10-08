# Solaris screenshots to capture

Same setup as `tests/solaris/`: 1x QEMU screenshot plus snippets of single UI text elements (window title, File Manager path).

- [ ] **Bold at medium (17px)**: Solaris has no Bold17, so this shows what CDE does instead (falls back to Bold18, emboldens 17, or something else). It decides how we ship a 17px zoom level.
- [ ] **Bold at xsmall and small**: the bold atlases have no test yet. Any bold UI text works (Help Viewer headings, dialog titles).
- [ ] **Regular at 10px and 18px**: the other shipped sizes, probably the font sizes either side of the ones done so far (check which sizes give 10 and 18).
- [ ] **More characters**: `crimson-4` only covers a few glyphs. Make a folder named something like `0123456789.abcdefghijklmnopqrstuvwxyz` (plus capitals and `/` in the path) so the File Manager path shows the characters the calculator uses.
- [ ] **Disabled text shadow**: does CDE emboss disabled text (greyed-out button labels, insensitive text fields)? The CDE theme gives it `text-shadow: 1px 1px 0` (`theme.css:286`, `:356`), but bitmapText.ts doesn't draw shadows, so the browser draws it from the invisible WOFF text, possibly soft or off by half a pixel. If CDE has it, draw it on the canvas as an offset tinted glyph; if not, `text-shadow: none` under `.bitmap-text`.
