# syntax=docker/dockerfile:1

FROM node:22.18-bookworm-slim AS builder
ARG CONTRACT_CONFIGS

WORKDIR /app
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm i -g npm@11.6.2 && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential

COPY --parents \
    package.json \
    package-lock.json \
    .npmrc \
    .nvmrc \
    patches \
    packages/*/package.json \
    services/btc-payment/package.json \
    ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm ci
COPY --parents tsconfig*.json packages ./
RUN npm run build

RUN mkdir -p /tmp/artifacts && \
    find /app/packages /app/services -type d -name dist -not -path '*/node_modules/*' \
    -exec cp -a --parents {} /tmp/artifacts \;

FROM node:22.18-bookworm-slim AS prod
ARG CONTRACT_CONFIGS
ARG SERVICE_DIR=/app/services/btc-payment

LABEL maintainer="ErgoRaffle team <team@ergoraffle.com>"
LABEL description="Docker image for the btc-payment service owned by ErgoRaffle organization."
LABEL org.label-schema.vcs-url="https://github.com/ergoraffle/raffle-v2"

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm i -g npm@11.6.2 && \
    adduser --disabled-password --home /app --no-create-home --uid 3000 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d ${SERVICE_DIR}/logs && \
    umask 0077 && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --parents \
    package.json \
    package-lock.json \
    .npmrc \
    .nvmrc \
    patches \
    packages/*/package.json \
    services/btc-payment/package.json \
    ./
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm ci && chown -R ergo:ergo /app/
COPY --chmod=700 --chown=ergo:ergo . .
COPY --from=builder --chown=ergo:ergo /tmp/artifacts/app/ /app/

WORKDIR ${SERVICE_DIR}
USER ergo
EXPOSE 3000

ENTRYPOINT ["npm", "run", "start"]
