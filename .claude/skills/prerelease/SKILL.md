---
name: prerelease
description: Checks to run before merging to main or deploying the subnet calculator, including that every shipped font's source is documented in the README and its licence ships with it.
---

# Prerelease

Run these and report each result. Stop on the first failure and say what failed.

1. `npm run lint`, `npm test` and `npm run build` all pass.
2. Fonts are documented: every font in `FONTS` in `src/main.ts` has a row in the README's Fonts table saying which files were used and where they were fetched from. Every file in `src/fonts/` and `public/fonts/` belongs to one of those rows. A new font without a row isn't ready to release.
3. Licences ship: every font under `public/fonts/` sits beside its licence file, which also appears in `dist/` after the build (for example `dist/fonts/luxi/COPYING`). Files under licences that forbid modification (Luxi) are byte-identical to upstream: compare them with the release tarball named in the README.
4. Nothing from `font_wip/` (gitignored scratch work) is referenced from `src/`, `public/`, `tests/` or `index.html`.
5. `TODO.md` items that this release completes are ticked or removed.
