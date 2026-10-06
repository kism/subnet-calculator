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
  - `reference.test.ts` checks `calculate()` against `tests/cases.json`. `npm test` runs `scripts/gen_cases.py` first (as `pretest`) to generate that file from Python's `ipaddress`. The file is gitignored.
- `src/main.ts` holds the DOM wiring.
  - A `/suffix` on the IP (either `/24` or `/255.255.255.0`) wins. When there's a suffix, both mask boxes are disabled and show the parsed prefix.
  - Without a suffix, whichever mask box was last used (`maskActive`) decides the prefix. `syncMasks()` copies a valid value into the other box.
  - Results are table rows. A row whose label is `Error` gets the red `.error` class.
  - The A-/A/A+ buttons set `body` font-size and store it in a `zoom` cookie. Every size in `style.css` is in `em` (except 1px borders), so the whole panel scales. `#zoom` is fixed at 12px and hidden at ≤600px width.

## Gotchas

- Browser support goes back to Chrome 61, Firefox 60 and Safari 11.
  - `vite.config.ts` sets the build target to `es2015`.
  - Vite can rewrite newer syntax for those browsers, but it can't add missing browser APIs. Avoid newer DOM APIs such as `replaceChildren` and the Cookie Store API, which is why there's a `biome-ignore` on `document.cookie`.
- Biome reformats CSS `font:` shorthands onto multiple lines, so text replacements that assume one line will silently miss. Check the result after scripted edits.
- The font comes from the `@fontsource/dejavu-mono` imports in `main.ts`, and Vite bundles it. The CSS family name is `"DejaVu Mono"`.
- `scripts/build.sh` passes the git remote URL (with credentials stripped) and the HEAD sha to Vite as `VITE_SOURCE`.
  - Vite fills that into the `<!-- %VITE_SOURCE% -->` comment in `index.html`.
  - The script tolerates there being no git repo or remote.
  - Keep the credential stripping if you change the script.
