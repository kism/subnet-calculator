# subnet-calculator: development

## Setup

```bash
nvm use
pnpm install
```

pnpm only runs dependency install scripts that are approved in `pnpm-workspace.yaml` (`allowBuilds`). If a new
dependency needs one, `pnpm install` stops and names it, then approve it with `pnpm approve-builds <package>`.

## Commands

```bash
pnpm dev                     # vite dev server
pnpm lint                    # biome check (pnpm format to fix)
pnpm typecheck               # tsc, src/ against ES2017 and tests/ against ES2022
pnpm test                    # generates tests/cases.json, then vitest run
pnpm test -t 'handles /31'   # a single test by name
pnpm coverage                # vitest with coverage, lcov in coverage/
pnpm build                   # scripts/build.sh: tsc, then vite build into dist/
pnpm preview                 # serve dist/ in workerd, as it would run deployed
```

`scripts/run-ci-local.sh` runs everything the workflows do, in order, and formats while it's at it.

Vite doesn't typecheck, so `pnpm build` runs `tsc` first.

### Tests

Vitest runs `tests/**/*.test.ts` in Node. Keep logic in plain functions that don't touch the DOM (`src/subnet.ts`) so it
can be tested here. The Cloudflare plugin is off under Vitest (see `vite.config.ts`). `pretest` runs
`scripts/gen_cases.py`, which writes `tests/cases.json` from Python's `ipaddress` for `tests/reference.test.ts`.

### Build-time values

`scripts/build.sh` sets `VITE_SOURCE` to `<repo> @ <sha>`, which ends up in an HTML comment at the top of the page.
`.env.development` is the fallback for `pnpm dev`.

## Deploying

Link the repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with:

- Build command: `pnpm run build`
- Deploy command: `pnpm wrangler deploy`
- Non-production branch deploy command: `pnpm wrangler versions upload`

`pnpm build` writes `dist/wrangler.json` and `.wrangler/deploy/config.json`, which point `wrangler deploy` at the built
assets, so there's no `main` or `assets` in `wrangler.jsonc`. To check what would be uploaded without deploying:

```bash
pnpm build && pnpm wrangler deploy --dry-run
```

Production is served at <https://network.autist.network>. Non-production branches get a Preview at
`<branch>.network-preview.autist.network`, plus a per-version link at
`<version>-subnet-calculator.<subdomain>.workers.dev`.

### Custom domain

The domains are the `routes` in `wrangler.jsonc`. Deploys replace every custom domain on the Worker with that list,
so add domains there, not in the dashboard.
