# Solaris screenshots to capture

Same setup as `tests/solaris/`: 1x QEMU screenshot plus snippets of single UI text elements (window title, File Manager path).

- [ ] **Bold at medium (17px)**: Solaris has no Bold17, so this shows what CDE does instead (falls back to Bold18, emboldens 17, or something else). It decides how we ship a 17px zoom level.
- [ ] **Bold at xsmall and small**: the bold atlases have no test yet. Any bold UI text works (Help Viewer headings, dialog titles).
- [ ] **Regular at 10px and 18px**: the other shipped sizes, probably the font sizes either side of the ones done so far (check which sizes give 10 and 18).
- [ ] **More characters**: digits, lowercase, capitals, `.` and `/` at small are done (`solaris_small_chars.png`, `solaris_small_caps.png`). Still missing: `:` (IPv6) at small, and the same set at xsmall.
