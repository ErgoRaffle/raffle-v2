FROM node:22.18.0
ARG SERVICE_DIR=/app/services/background-job

LABEL maintainer="ErgoRaffle team <team@ergoraffle.com>"
LABEL description="Docker image for the background-job owned by ErgoRaffle organization."
LABEL org.label-schema.vcs-url="https://github.com/ErgoRaffle/raffle-v2"
RUN npm install -g npm@11.6.2

RUN adduser --disabled-password --home /app --uid 3000 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d ${SERVICE_DIR}/logs \
    && chown -R ergo:ergo /app/ && umask 0077
USER ergo

WORKDIR /app
COPY --chmod=700 --chown=ergo:ergo . .
RUN npm ci
RUN npm run build
WORKDIR ${SERVICE_DIR}

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["npm", "run", "start"]
