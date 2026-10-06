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
