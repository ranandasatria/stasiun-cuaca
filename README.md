# Weather Station Monitoring Platform

IoT platform that receives, validates, stores, aggregates and visualizes telemetry from a fleet of weather stations.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js (ESM) + Express 5 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Frontend | Next.js 16 (App Router) + Recharts |
| Tests | Vitest |
| Docs | Swagger UI at `/api-docs` |
| Runtime | Docker + docker-compose |

## Why this stack

- **Node.js + Express** — simple to set up and fast to build with, which matters given the time limit.
- **Prisma** — handles migrations and database queries cleanly, so there is less boilerplate and fewer SQL mistakes.
- **PostgreSQL** — widely used and quick to set up, and a good fit for time-series data.
- **Next.js** — commonly used for React apps and quick to start a project with.
- **Vitest** — a small and simple test runner.
- **Docker** — commonly used and makes the whole app run with a single command.

## Quick start (Docker, one command)

```
docker compose up --build
```

This starts the database, backend and frontend. The backend applies migrations and seeds data automatically, so there is nothing else to do.

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api-docs

Log in with a user you register on the `/register` page (or seed one via the API).

## Quick start (local development)

```
# 1. database
docker compose up -d db

# 2. backend
cd backend
npm install
cp .env.example .env            # then adjust values
npx prisma migrate deploy
npx prisma db seed
npm run dev                     # http://localhost:3001

# 3. frontend
cd ../frontend
npm install
npm run dev                     # http://localhost:3000
```

Optionally, run the device simulator (it reads the API keys written by the seeder):

```
node simulator/sim.js            # 3 devices, every 60s
node simulator/sim.js --fast     # every 5s
node simulator/sim.js --scenario=batch
node simulator/sim.js --scenario=duplicate
```

## Architecture

Layered, feature-based modules. Requests flow top to bottom:

```
routes -> controller -> service -> Prisma -> PostgreSQL
```

```
backend/src/
  modules/
    auth/          register / login (JWT)
    locations/     location master data
    devices/       device CRUD, lifecycle, health
    sensors/       sensor types, sensors, installations, calibration
    ingest/        telemetry, batch, heartbeat (device API key)
    readings/      latest, time-series, summary, dashboard overview
    aggregate/     hourly rollups + repair
  middleware/      requestId, requireAuth (JWT), deviceAuth (API key), rateLimit, errorHandler
  utils/           httpError, validateTelemetry, normalize, qualityFlag, dedup, rain, calibration
  config/          swagger
  lib/             prisma client
  routes/          central API router (mounts every module under /api/v1)
```

Design rules: routes are thin, controllers only translate HTTP, all logic lives in services, services never touch `req`/`res`.

## Design decisions

- **Time is stored in UTC, shown in WIB.** Timestamps are saved in UTC and converted to WIB only when displayed.
- **Two kinds of login.** The dashboard uses JWT; devices use an API key. They have different needs, so they are handled separately.
- **Seed data and a simulator.** A seeder fills 7 days of history, and a simulator sends new data like a real device, so the dashboard works without real hardware.
- **Soft delete for devices.** Deleting a device only marks it, so past readings are kept.
- **Hourly summaries for long ranges.** Long charts read hourly summaries instead of raw rows, so responses stay small and fast.
- **Rate limit per device.** Each device has its own limit, so one misbehaving device cannot flood the system.

## Assumptions

1. One device = one active location.
2. The F.1 payload format is fixed; the backend adapts to it.
3. `1 tip rain_counter = 0.2 mm`; the counter resets to 0 on restart.
4. Timestamps are stored in UTC and shown in WIB (Asia/Jakarta).
5. The time-series reference is `device_time` (`ts`); `server_time` is only used for the "last seen" health check.
6. A device must be `ACTIVE` to send telemetry (lifecycle is enforced).
7. Offline buffering is up to 3 hours (180 records); batches are capped at 500.

## Not finished / next steps

- **TimescaleDB** was not used. The same effect is approximated with a composite index, an aggregate table and a scheduled rollup. A hypertable + continuous aggregate + retention policy would be the production path.
- **No MQTT ingestion** (HTTP only). It is listed as a bonus.
- **Real-time is polling** (30s on the overview); WebSocket/SSE would be an upgrade.
- **No configurable alerting** (e.g. rain > 20 mm/h). The plan is a worker that evaluates hourly aggregates and writes to an `alerts` table.
- **Wind rose** is simplified to a direction + speed chart instead of a true wind rose.
- **Retention/downsampling job** for old raw rows is not scheduled yet.
- The Docker image runs the seeder on every start. It is idempotent, but production would run it once.

## Documentation

- `docs/API.md` — endpoint reference and JSON examples (part F)
- `docs/F3.md` — how the 8 required cases in part F.3 are handled
- `docs/erd.mmd` / `docs/erd.png` — ERD (part C)
- `docs/flow.md` — data flow diagram (part D)
- `docs/indexes.md` — rationale for each index
- `JAWABAN.md` — design answers and short essays
- Swagger UI at `http://localhost:3001/api-docs`
