# Subnet Calculator

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
