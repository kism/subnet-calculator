# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A static single-page IPv4 subnet calculator with no UI framework, just plain HTML, CSS and TypeScript. Vite bundles it into `dist/`, which is deployed as a Cloudflare Workers static-assets site (`wrangler.jsonc`, served at `network.autist.network`). Deployment happens by linking the repo in Cloudflare Workers. The structure mirrors the sibling `../idiom-generator` project.

## Commands

Use the Node version in `.nvmrc` (26) and npm.

- `npm run dev`: Vite dev server.
- `npm test`: runs vitest once. `npm run coverage` does the same with coverage, writing `coverage/lcov.info`.
  - Single file: `npx vitest run tests/subnet.test.ts`.
  - Single test by name: `npx vitest run -t "handles /31"`.
- `npm run build`: runs `scripts/build.sh`, which type-checks with tsc (`noEmit`) and then runs `vite build` into `dist/`.
- `npm run lint`: `biome check`, which covers both linting and formatting. `npm run format` applies the fixes.
- CI is two workflows: `lint.yml` (lint, then build) and `test.yml` (tests with coverage, uploaded to Codecov via OIDC).

## Layout

- `src/subnet.ts` holds all the address math, as pure functions with no DOM access.
  - IPs are unsigned 32-bit numbers. Normalise with `>>> 0` after any bitwise operation.
  - `/31` and `/32` are treated as having no network or broadcast address reserved (RFC 3021).
  - Masks with gaps are rejected.
- Tests live in `tests/`. Keep the logic in `subnet.ts` so it stays testable.
  - `subnet.test.ts` holds the hand-written cases.
  - `solaris.test.ts` draws strings from the shipped 12/14px glyph atlases and compares them pixel for pixel with the text in `tests/solaris/*_path.png` and `*_title.png`, snippets cut from the 1x Solaris 2.6 screenshots beside them. The test decodes the PNGs itself.
  - `reference.test.ts` checks `calculate()` against `tests/cases.json`. `npm test` runs `scripts/gen_cases.py` first (as `pretest`) to generate that file from Python's `ipaddress`. The file is gitignored.
- `src/main.ts` holds the DOM wiring.
  - A `/suffix` on the IP (either `/24` or `/255.255.255.0`) wins. When there's a suffix, both mask boxes are disabled and show the parsed prefix.
  - Without a suffix, whichever mask box was last used (`maskActive`) decides the prefix. `syncMasks()` copies a valid value into the other box.
  - Once the IP box has held a valid value for a second, `update()` saves it (whitespace stripped) to an `ip` cookie. On load that cookie pre-fills the box.
  - Results are `flex-row` divs of two `.lowered .padding` panels (classes from `classic-stylesheets`) inside the `.raised` `#info`. A row whose label is `Error` gets the red `.error` class. Values get `<wbr>`s before `/` and after `.` so they wrap between octets on narrow phones (and copy cleanly).
  - The A-/A/A+ buttons step through the current font's levels in `FONTS` (Lucida Sans: 10, 12, 14, 18, 20, 24, 28, 36px; Terminus: 12–32px), set `body`'s font to that size and its `"<font> <size>"` family, and store the size in a `zoom` cookie. Every size in `style.css` is in `em` (except 1px borders), so the whole panel scales. `#controls` (zoom, skin and font buttons) is fixed at 12px.
  - The font row's `<`/name/`>` buttons cycle through `FONTS` (cookie `font`). Switching snaps the zoom to the new font's next level down, and sets `--family-12`/`--family-18`, which `style.css` uses for the fixed-size text (Settings, phones). Every font needs a 12 and an 18 family.
  - At ≤600px width (phones), `main` is pinned at 18px (a native Lucida size, and ≥16px so iOS doesn't zoom on input focus) and the zoom row (`#zoom`) is hidden. `body` becomes a full-height flex column and `#controls` a static, shrink-wrapped window pushed to the bottom right by auto margins. At the same breakpoint, `main.ts` keeps `main` styled `.active` unless Settings was the last window tapped or focused, in which case `#controls` gets `.active`. Taps count because iOS doesn't focus tapped buttons.
  - The `<`/name/`>` buttons cycle through every CDE skin from `classic-stylesheets`. All skins are bundled via `import.meta.glob(..., { query: '?inline' })` and the chosen one is written into a `<style>` and a `skin` cookie. The default is `crimson-4`.

## Gotchas

- Browser support goes back to Chrome 61, Firefox 60 and Safari 11.
  - `vite.config.ts` sets the build target to `es2015`.
  - Vite can rewrite newer syntax for those browsers, but it can't add missing browser APIs. Avoid newer DOM APIs such as `replaceChildren` and the Cookie Store API, which is why there's a `biome-ignore` on `document.cookie`.
- Biome reformats CSS `font:` shorthands onto multiple lines, so text replacements that assume one line will silently miss. Check the result after scripted edits.
- The default font is Solaris 2.6's Lucida Sans bitmaps (`src/fonts/`), turned into WOFF2/WOFF with one square per pixel by `scripts/pcf2woff.py` (`uv run scripts/pcf2woff.py OUT_DIR *.pcf.Z`; the source PCFs aren't in the repo).
  - Terminus comes from the ISO8859-1 `ter-1<size>{n,b}.pcf.gz` files in Fedora's `terminus-fonts-legacy-x11` (`/usr/share/fonts/terminus-fonts-legacy-x11/`), copied to `Terminus<size>`/`Terminus-Bold<size>.pcf.gz` before conversion, as the output is named after the input file. Its 12px bold is identical to the regular in the source font.
  - `src/fonts.css` has one family per zoom level, `"Lucida Sans <size>"`: the original 10/12/14/18px bitmaps, or one of them doubled (20 = 10×2, 24 = 12×2, 28 = 14×2, 36 = 18×2), regular and bold always from the same size. 8 was too small, 16 (8×2) too blocky, and mixing a native regular with a doubled bold looked wrong. Phones use the 18 family.
  - As plain WOFF text, only multiples of 12 are sharp on macOS (the em layout was designed at 12px, so text elsewhere starts between pixels). The bitmap overlay below snaps every glyph, which makes all levels sharp. Adding a level means a family in `fonts.css`, its WOFFs and PNG/JSON atlas in `src/fonts/`, and the size in `FONTS`; the overlay picks the largest atlas size that divides the level.
  - `src/bitmapText.ts` (experimental) draws all text from PNG glyph atlases (`scripts/pcf2atlas.py`, same PCFs) on a fixed full-viewport canvas, so no browser smoothing or half-pixel placement touches it. The real text stays in the WOFF fonts but with `-webkit-text-fill-color: transparent` (the `.bitmap-text` class, added once the atlases load), keeping selection, copy, caret and screen readers; glyphs are drawn at each invisible character's layout position and tinted with its `color`. Input values are drawn from the input's content box and `scrollLeft`. It redraws on DOM mutations, input, scroll and resize.
  - macOS smooths text even when it's pixel-aligned, so `style.css` turns that off at whole device-pixel ratios. `main.ts` keeps `body` an even number of pixels wide so the centred `main` doesn't land on a half pixel.
  - The proportional font makes `ch` a bad width unit, so label widths are in `em` measured against bold "Broadcast".
- `scripts/build.sh` passes the git remote URL (with credentials stripped) and the HEAD sha to Vite as `VITE_SOURCE`.
  - Vite fills that into the `<!-- %VITE_SOURCE% -->` comment in `index.html`.
  - The script tolerates there being no git repo or remote.
  - Keep the credential stripping if you change the script.
