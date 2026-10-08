# Subnet Calculator

[![Lint](https://github.com/kism/subnet-calculator/actions/workflows/lint.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/lint.yml)
[![Test](https://github.com/kism/subnet-calculator/actions/workflows/test.yml/badge.svg)](https://github.com/kism/subnet-calculator/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/kism/subnet-calculator/graph/badge.svg)](https://codecov.io/gh/kism/subnet-calculator)
[![site](https://img.shields.io/website?url=https%3A%2F%2Fnetwork.autist.network)](https://network.autist.network/)

IPv4 subnet calculator. Paste an address with or without a `/prefix` or `/netmask`.

There are so many online tools for this, but I made this to get a calculator that works the way I want.

## Development

```sh
nvm use
npm ci
npm run dev
npm test
```

Deployment is done by linking the repo in Cloudflare workers.

## Fonts

The bitmap fonts are converted from X11 PCF files by `scripts/pcf2woff.py` (WOFF2/WOFF) and `scripts/pcf2atlas.py` (PNG/JSON atlas) into `src/fonts/`. The source files aren't in the repo.

| Font | Files used | Fetched from |
| --- | --- | --- |
| Lucida Sans (default) | `LucidaSans{,-Bold}{10,12,14,18}.pcf.Z` | A Solaris 2.6 install (OpenWindows X11 fonts), the same system as the screenshots in `tests/solaris/` |
| Terminus | `ter-1{12..32}{n,b}.pcf.gz` (ISO8859-1), renamed `Terminus{,-Bold}<size>.pcf.gz` | Fedora package `terminus-fonts-legacy-x11`, `/usr/share/fonts/terminus-fonts-legacy-x11/` |
| Helvetica | `helv{R,B}{10,12,14,18,24}-ISO8859-1.pcf.gz`, renamed `Helvetica{,-Bold}<size>.pcf.gz` | Package `xorg-x11-fonts-ISO8859-1-75dpi` (`dnf download`, unpacked with `rpm2archive`); the plain `xorg-x11-fonts-75dpi` copies are ISO10646, which the converter can't read |
| Luxi Sans TTF, Luxi Serif TTF | `luxis{r,b}.ttf`, `luxir{r,b}.ttf` | X.org's [`font-bh-ttf-1.0.4.tar.xz`](https://xorg.freedesktop.org/releases/individual/font/font-bh-ttf-1.0.4.tar.xz). Shipped unmodified in `public/fonts/luxi/` with their `COPYING`, as the licence forbids modifying them |
