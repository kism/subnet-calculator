# Subnet Calculator

[![Lint](https://github.com/kism/subnet-calculator/actions/workflows/lint.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/lint.yml)
[![Type Check](https://github.com/kism/subnet-calculator/actions/workflows/check_types.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/check_types.yml)
[![Test](https://github.com/kism/subnet-calculator/actions/workflows/test.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/test.yml)
[![Build](https://github.com/kism/subnet-calculator/actions/workflows/build.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/kism/subnet-calculator/graph/badge.svg)](https://codecov.io/gh/kism/subnet-calculator)
[![site](https://img.shields.io/website?url=https%3A%2F%2Fnetwork.autist.network)](https://network.autist.network/)

IPv4 and IPv6 subnet calculator. Paste an address with or without a `/prefix` or `/netmask`.

There are so many online tools for this, but I made this to get a calculator that works the way I want.

## Prerequisites

- Node, the version in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- [pnpm](https://pnpm.io/installation): `npm i -g pnpm`. The version is pinned in `packageManager` in `package.json`
- Python 3, which generates the reference test cases
- [Git LFS](https://git-lfs.com/), for the fonts and test screenshots

## Run

```bash
nvm use
pnpm install
pnpm dev
```

See [README_dev.md](README_dev.md) for testing, building, previewing and deploying.

## Workflows

The `.github` folder has one workflow per check, so a failing badge tells you what broke:

| Workflow          | Runs                                      |
| ----------------- | ----------------------------------------- |
| `lint.yml`        | Biome                                     |
| `check_types.yml` | `tsc`                                     |
| `test.yml`        | Vitest with coverage, uploaded to Codecov |
| `build.yml`       | `pnpm build`                              |

## Fonts

The bitmap fonts are converted from X11 PCF files by `scripts/pcf2woff.py` (WOFF2/WOFF) and `scripts/pcf2atlas.py` (PNG/JSON atlas) into `src/fonts/`. The source files aren't in the repo.

| Font                          | Files used                                                                             | Fetched from                                                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lucida Sans (default)         | `LucidaSans{,-Bold}{10,12,14,18}.pcf.Z`                                                | A Solaris 2.6 install (OpenWindows X11 fonts), the same system as the screenshots in `tests/solaris/`                                                                                                                        |
| Terminus                      | `ter-1{12..32}{n,b}.pcf.gz` (ISO8859-1), renamed `Terminus{,-Bold}<size>.pcf.gz`       | Fedora package `terminus-fonts-legacy-x11`, `/usr/share/fonts/terminus-fonts-legacy-x11/`                                                                                                                                    |
| Helvetica                     | `helv{R,B}{10,12,14,18,24}-ISO8859-1.pcf.gz`, renamed `Helvetica{,-Bold}<size>.pcf.gz` | Package `xorg-x11-fonts-ISO8859-1-75dpi` (`dnf download`, unpacked with `rpm2archive`); the plain `xorg-x11-fonts-75dpi` copies are ISO10646, which the converter can't read                                                 |
| Luxi Sans TTF, Luxi Serif TTF | `luxis{r,b}.ttf`, `luxir{r,b}.ttf`                                                     | X.org's [`font-bh-ttf-1.0.4.tar.xz`](https://xorg.freedesktop.org/releases/individual/font/font-bh-ttf-1.0.4.tar.xz). Shipped unmodified in `public/fonts/luxi/` with their `COPYING`, as the licence forbids modifying them |
