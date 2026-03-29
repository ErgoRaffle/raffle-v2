# @ergo-raffle/api

## Table of contents

- [Introduction](#introduction)
- [Usage](#usage)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running](#running)

## Introduction

REST API service for ErgoRaffle. Provides endpoints for frontend clients to query raffle information.

## Usage

### Requirements

- Node.js >= 22.18.0
- npm 11.6.2
- PostgreSQL or SQLite

### Installation

```sh
npm install
```

### Configuration

Configuration is loaded from `config/` directory using the [node-config](https://github.com/node-config/node-config) library. The default values are in `config/default.yml`. Create a `config/local.yml` file to override them:

```yaml
logs:
  - type: console
    level: info
  - type: file
    level: info
    path: ./logs/
    maxSize: 20m
    maxFiles: 14d

database:
  type: sqlite # sqlite | postgres
  path: ./db.sqlite3
  # For postgres:
  # type: postgres
  # host: localhost
  # port: 5432
  # username: postgres
  # password: ''
  # name: raffle_v2

api:
  host: localhost
  port: 8800
```

| Key                  | Type                          | Default        | Description                                  |
| -------------------- | ----------------------------- | -------------- | -------------------------------------------- |
| `logs[].type`        | `file` \| `console` \| `loki` | `console`      | Log output type                              |
| `logs[].level`       | string                        | `info`         | Log level (`debug`, `info`, `warn`, `error`) |
| `logs[].path`        | string                        | —              | Log file directory (required for `file`)     |
| `logs[].maxSize`     | string                        | —              | Max size per log file (required for `file`)  |
| `logs[].maxFiles`    | string                        | —              | Max retention duration (required for `file`) |
| `logs[].serviceName` | string                        | —              | Service name label (required for `loki`)     |
| `logs[].host`        | string                        | —              | Loki host URL (required for `loki`)          |
| `logs[].basicAuth`   | string                        | —              | Basic auth credentials (optional, `loki`)    |
| `database.type`      | `sqlite` \| `postgres`        | `sqlite`       | Database engine                              |
| `database.path`      | string                        | `./db.sqlite3` | SQLite file path (required for `sqlite`)     |
| `database.host`      | string                        | —              | Database host (required for `postgres`)      |
| `database.port`      | number                        | —              | Database port (required for `postgres`)      |
| `database.username`  | string                        | —              | Database username (required for `postgres`)  |
| `database.password`  | string                        | —              | Database password (required for `postgres`)  |
| `database.name`      | string                        | —              | Database name (required for `postgres`)      |
| `api.host`           | string                        | `localhost`    | API server bind host                         |
| `api.port`           | number                        | `8800`         | API server bind port                         |

### Running

```sh
# production
npm run start

# development (with watch mode)
npm run start:dev
```

Swagger UI is available at `http://<host>:<port>/swagger` after the service starts.
