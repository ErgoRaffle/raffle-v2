---
'@ergo-raffle/background-job': minor
'btc-payment': minor
'@ergo-raffle/api': minor
---

Improve the size of Docker image:

- Improve GA for using cache while building the image
- Improve Docker build to use cache as much as possible and do not store unneeded files in the image
- Pass CONTRACT_CONFIGS arg to docker builds
- Add `|| true` for husky in prepare to work with `NODE_ENV=production` set before `npm ci`
- Add tsx to dependencies
- Add pg to dependencies of api service
