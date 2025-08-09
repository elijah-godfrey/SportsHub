## SportsHub Developer Guide

A developer-focused reference for contributing to and maintaining SportsHub — a platform that aggregates live sports across multiple leagues and enables authenticated users to host and manage their own games.

### TL;DR (First Run)

```bash
# Prereqs: Node.js 20, pnpm, Docker, Docker Compose

pnpm i

# Start local infra + apps (API, Web, DB, Redis)
docker compose up -d

# Generate DB client and run migrations
pnpm -w prisma:generate
pnpm -w prisma:migrate:dev

# Seed baseline data (sports, teams)
pnpm -w seed

# Start dev servers
pnpm -w dev
```

---

## 1) System Overview

**Purpose**: Aggregate live sports data and allow user-hosted games in a single real-time UI.

**Core features**:
- **Multi-sport API adapters**: NBA, NHL, MLB, Soccer (extensible).
- **Unified database schema** for all sports.
- **Real-time updates** via Socket.IO.
- **Redis** caching + **BullMQ** background jobs.
- **Authentication & authorization** via Better Auth (email/password + OAuth).
- **User-hosted games** (CRUD) with ownership checks.
- **Admin/monitoring endpoints** for health and metrics.

**Tech stack**:
- **Backend**: Node.js 20, Fastify, TypeScript
- **Frontend**: React 18, Vite, TypeScript, Tailwind
- **Database**: PostgreSQL (Prisma ORM)
- **Cache & jobs**: Redis (BullMQ)
- **Real-time**: Socket.IO
- **Auth**: Better Auth (email/password + OAuth)
- **Testing**: Vitest, Testing Library, Supertest
- **Deployment**: Docker + Docker Compose, GitHub Actions CI/CD
- **Observability**: Pino logging, Prometheus metrics, Grafana dashboard

---

## 2) Repository Structure

Monorepo layout using pnpm workspaces:

```text
SportsHub/
  apps/
    api/         # Fastify backend API
    web/         # React frontend app
  packages/
    adapters/    # API integrations for each sport
    types/       # Shared DTOs, Zod schemas
    utils/       # Shared helpers (logging, constants)
  scripts/       # DB seeds, maintenance scripts
  docs/          # Developer documentation
```

- **apps/**: Deployable services (runnable, containerized). Each has its own `Dockerfile` and env config.
- **packages/**: Shared libraries used across apps (published locally via pnpm workspaces).
- **scripts/**: One-off or scheduled utilities (seeds, migrations, data backfills, maintenance).

Workspaces are declared in the root `package.json` to enable hoisting and shared dependency management.

---

## 3) API Layer

### 3.1 Adapter Interface

Adapters live in `packages/adapters`. Each adapter is responsible for fetching and normalizing upstream JSON into the shared `GameCore` format.

```ts
// packages/types/src/game.ts
export type SportCode = 'nba' | 'nhl' | 'mlb' | 'soccer';

export interface TeamRef {
  id: string;        // stable ID we map to Team table
  name: string;      // display name
  shortName?: string;
  abbreviation?: string; // e.g., LAL
}

export type GameStatus =
  | { state: 'scheduled'; startTime: string }
  | { state: 'live'; period: number; clock?: string }
  | { state: 'final' };

export interface GameScore {
  home: number;
  away: number;
  period?: number;
}

export interface GameCore {
  id: string;             // stable game ID across our system
  sport: SportCode;
  league?: string;        // optional sub-league/competition (e.g., EPL)
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  status: GameStatus;
  score: GameScore;
  updatedAt: string;      // ISO timestamp
  startsAt?: string;      // scheduled start (ISO)
  venue?: string;
  metadata?: Record<string, unknown>;
}

export interface SportAdapter {
  sport: SportCode;
  fetchActiveGames(): Promise<GameCore[]>; // must be idempotent and safe to poll
}
```

Each adapter implements `fetchActiveGames()` to return only scheduled/live games (and optionally very-recent finals for continuity) normalized to `GameCore`.

### 3.2 Normalization Guidelines

- Map upstream IDs → stable `GameCore.id` (prefix with sport if needed, e.g., `nba:2024-...`).
- Ensure `homeTeam` and `awayTeam` map to canonical `Team` records (by upstream ID map or name mapping table).
- Populate `status` consistently across sports (scheduled/live/final).
- Populate `score` every poll for live games.
- Include `updatedAt` (upstream timestamp or now).

### 3.3 Background Polling → DB + Redis

- A BullMQ job (queue per sport) periodically calls `fetchActiveGames()`.
- For each returned `GameCore`:
  - Upsert into `Game` and `GameScore` tables (Prisma).
  - Publish Socket.IO events (`game:new`, `game:update`, `game:remove` when applicable).
  - Update Redis cache for `/games/live` collection.
- Failed calls are retried with exponential backoff. A circuit breaker disables an adapter temporarily after N consecutive failures.

### 3.4 REST Endpoints (Fastify)

- `GET /games/live` — returns cached active games (Redis, TTL 10–15s).
- `GET /games/:id` — returns a specific game by ID (DB→cache fallback).
- `POST /games` — create a hosted game (auth required). Body validated via Zod.
- `PATCH /games/:id` — update hosted game (auth + ownership required).
- `GET /health` — service health and dependency checks.
- `GET /metrics` — Prometheus metrics in text exposition format.

Example response for `GET /games/live`:

```json
[
  {
    "id": "nba:2024-10-18-LAL-GSW",
    "sport": "nba",
    "homeTeam": { "id": "nba:LAL", "name": "Los Angeles Lakers", "abbreviation": "LAL" },
    "awayTeam": { "id": "nba:GSW", "name": "Golden State Warriors", "abbreviation": "GSW" },
    "status": { "state": "live", "period": 2, "clock": "05:43" },
    "score": { "home": 56, "away": 61, "period": 2 },
    "updatedAt": "2024-10-18T03:12:45.120Z",
    "startsAt": "2024-10-18T02:00:00.000Z"
  }
]
```

---

## 4) Real-Time Updates

### 4.1 Socket.IO Integration

Socket.IO is registered as a Fastify plugin. On job updates, events are emitted to relevant rooms.

```ts
// apps/api/src/realtime.ts
import fp from 'fastify-plugin';
import fastifyIO from 'fastify-socket.io';

export default fp(async (app) => {
  app.register(fastifyIO, {
    cors: { origin: /localhost/, credentials: true },
  });

  app.io.on('connection', (socket) => {
    socket.on('subscribe:all', () => socket.join('games:all'));
    socket.on('subscribe:sport', (sport: string) => socket.join(`games:sport:${sport}`));
    socket.on('subscribe:game', (id: string) => socket.join(`games:id:${id}`));
  });
});

// Emission helper
export function emitGameUpdate(io: any, game: GameCore) {
  io.to('games:all').emit('game:update', game);
  io.to(`games:sport:${game.sport}`).emit('game:update', game);
  io.to(`games:id:${game.id}`).emit('game:update', game);
}
```

### 4.2 Event Types

- `game:new` — new game appears in active set
- `game:update` — score/status/clock changes
- `game:remove` — game leaves the active set (final or canceled)

### 4.3 Subscription Model

- Subscribe to all games: `subscribe:all`
- Subscribe to a sport: `subscribe:sport` with sport code
- Subscribe to a specific game: `subscribe:game` with `gameId`

### 4.4 Redis Pub/Sub for Scale-Out

For multi-instance deployments, Socket.IO uses the Redis adapter so events propagate across nodes. Background jobs publish updates through Redis channels consumed by all API instances.

---

## 5) Database Schema (Prisma)

### 5.1 Models

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  user
  admin
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  role      Role     @default(user)
  games     Game[]   @relation("HostedGames")
  meta      UserGameMeta[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Sport {
  id        String   @id
  name      String
  createdAt DateTime @default(now())
  teams     Team[]
  games     Game[]
}

model Team {
  id        String   @id
  sportId   String
  name      String
  shortName String?
  abbr      String?
  createdAt DateTime @default(now())
  sport     Sport    @relation(fields: [sportId], references: [id])
  homeGames Game[]   @relation("HomeTeam")
  awayGames Game[]   @relation("AwayTeam")
}

model Game {
  id           String   @id
  sportId      String
  homeTeamId   String
  awayTeamId   String
  league       String?
  startsAt     DateTime?
  status       String   // scheduled|live|final
  period       Int?
  clock        String?
  venue        String?
  hostedById   String?  // non-null for user-hosted games
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sport        Sport    @relation(fields: [sportId], references: [id])
  homeTeam     Team     @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam     Team     @relation("AwayTeam", fields: [awayTeamId], references: [id])
  scores       GameScore[]
  hostedBy     User?    @relation("HostedGames", fields: [hostedById], references: [id])

  @@index([sportId])
  @@index([status])
  @@index([startsAt])
}

model GameScore {
  id        String   @id @default(cuid())
  gameId    String
  period    Int?
  home      Int
  away      Int
  createdAt DateTime @default(now())
  game      Game     @relation(fields: [gameId], references: [id])

  @@index([gameId])
}

model UserGameMeta {
  id        String   @id @default(cuid())
  userId    String
  gameId    String
  favorite  Boolean  @default(false)
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
  game      Game     @relation(fields: [gameId], references: [id])

  @@unique([userId, gameId])
}
```

### 5.2 Relationships (Mermaid)

```mermaid
erDiagram
  User ||--o{ Game : "hosts"
  User ||--o{ UserGameMeta : "meta"
  Sport ||--o{ Team : "has"
  Sport ||--o{ Game : "has"
  Team ||--o{ Game : "home"
  Team ||--o{ Game : "away"
  Game ||--o{ GameScore : "scores"
  User ||--o{ UserGameMeta : "favorites/notes"
```

### 5.3 Migrations

```bash
pnpm -w prisma:generate
pnpm -w prisma:migrate:dev --name init
pnpm -w prisma:studio # optional, browse data
```

---

## 6) Authentication & Authorization

### 6.1 Better Auth Configuration

- Email/password + OAuth (GitHub, Google).
- Sessions stored as signed JWT cookies.
- User roles: `user`, `admin`.

```ts
// apps/api/src/auth.ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  providers: {
    emailPassword: true,
    github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },
    google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  },
  session: {
    strategy: 'jwt-cookie',
    cookieName: 'sh.sid',
    secret: process.env.AUTH_SECRET!,
  },
});
```

### 6.2 Securing Routes

```ts
// apps/api/src/plugins/auth-guard.ts
import fp from 'fastify-plugin';

export default fp(async (app) => {
  app.decorate('requireUser', async (req: any, res: any) => {
    const user = await app.auth.getUser(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    return user;
  });

  app.decorate('requireOwnership', async (req: any, res: any, gameId: string) => {
    const user = await app.auth.getUser(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const game = await app.prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.hostedById !== user.id) return res.status(403).send({ error: 'Forbidden' });
    return { user, game };
  });
});
```

---

## 7) Caching & Background Jobs

### 7.1 Redis Usage

- Cache key: `cache:games:live` — JSON array of active games; TTL 10–15s.
- Active WS subscriptions: `ws:room:games:*` for simple counters if needed.
- Pub/Sub channels: `events:game:new|update|remove` for multi-node fanout.

### 7.2 BullMQ Queues

- Queue per sport: `poll:nba`, `poll:nhl`, `poll:mlb`, `poll:soccer`.
- Job data: `{ requestedAt, iteration }`.
- Concurrency: 2–4 per queue (configurable).
- Backoff: exponential, starting at 5s up to 2m.
- Retries: 3–5; after threshold, open circuit for 5–10 minutes.
- Metrics: success/failure counters, duration histograms.

```ts
// apps/api/src/jobs/poll.ts
import { Queue, Worker, QueueEvents } from 'bullmq';

export const queues = {
  nba: new Queue('poll:nba', { connection: { url: process.env.REDIS_URL! } }),
  // ... more queues
};

export function startWorkers(app: any) {
  const worker = new Worker('poll:nba', async () => {
    const games = await app.adapters.nba.fetchActiveGames();
    // upsert → emit → cache
  }, { connection: { url: process.env.REDIS_URL! } });

  worker.on('failed', (job, err) => app.log.error({ jobId: job?.id, err }, 'poll failed'));
}
```

---

## 8) Testing

### 8.1 Unit Tests

- Focus on adapters and services. Mock HTTP via `msw` or `nock`.
- Validate normalization into `GameCore`.

```bash
pnpm -w test:unit
```

### 8.2 Integration Tests

- Fastify routes tested with Supertest; spin up app with an in-memory or test DB.

```bash
pnpm -w test:integration
```

### 8.3 E2E (Frontend)

- React components and flows via Testing Library; mock Socket.IO client.

```bash
pnpm -w test:e2e
```

### 8.4 Load Testing (k6)

- Targets: `/games/live` and WS events. Track p95 latency and RPS.

```js
// scripts/k6/games_live.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 50, duration: '1m', thresholds: { http_req_duration: ['p(95)<200'] } };

export default function () {
  const res = http.get(`${__ENV.API_URL}/games/live`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 9) Deployment

### 9.1 Docker

- Each app has a `Dockerfile`.
- Local dev via Compose: API, Web, Postgres, Redis.

```yaml
# docker-compose.yml (excerpt)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sportshub
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  api:
    build: ./apps/api
    env_file: ./apps/api/.env
    ports: ["3001:3001"]
    depends_on: [db, redis]
  web:
    build: ./apps/web
    env_file: ./apps/web/.env
    ports: ["3000:3000"]
    depends_on: [api]
```

### 9.2 Environment Variables

Provide `.env.example` per app.

```env
# apps/api/.env.example
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sportshub
REDIS_URL=redis://localhost:6379

AUTH_SECRET=replace-with-32B-secret
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Poll intervals (ms)
POLL_NBA_MS=10000
POLL_NHL_MS=12000
POLL_MLB_MS=12000
POLL_SOCCER_MS=15000
```

Validate with Zod/Envalid at startup; fail fast when missing.

### 9.3 GitHub Actions CI

Stages: Lint → Typecheck → Test → Build → Deploy.

```yaml
# .github/workflows/ci.yml (excerpt)
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm i --frozen-lockfile
      - run: pnpm -w lint && pnpm -w typecheck && pnpm -w test
      - run: pnpm -w build
      # - name: Deploy ...
```

---

## 10) Observability

### 10.1 Logging

- Pino JSON logs with request IDs via `pino-http`.
- Include: `requestId`, `userId` (if present), `route`, `statusCode`, `durationMs`.

### 10.2 Metrics

- `/metrics` exposes Prometheus metrics: HTTP latency, job counters, WS connections.
- Example metrics:
  - `http_request_duration_seconds` (histogram)
  - `bullmq_jobs_total{status}`
  - `socketio_connections`
  - `redis_cache_hit_ratio`

### 10.3 Grafana Panels (examples)

- Active WebSocket connections over time.
- API latency p95/p99 by route.
- Redis cache hit rate.
- Job success/failure rate with alerts.

---

## 11) Development Workflow

### 11.1 Branching & Commits

- Branch names: `feat/<topic>`, `fix/<bug>`, `chore/<task>`.
- Commit messages follow Conventional Commits:
  - `feat(api): add soccer adapter`
  - `fix(web): correct live games polling interval`

### 11.2 Adding a New Sport

1) Create adapter in `packages/adapters/<sport>/index.ts` implementing `SportAdapter`.
2) Export it from `packages/adapters/index.ts`.
3) Register it in the API job scheduler and Socket rooms.
4) Add sport record to `Sport` table (seed script under `scripts/seed`).
5) Add teams mapping (seed or mapping table).
6) Write unit tests for normalization.
7) Verify `/games/live` and WS events locally.
8) Open PR with tests and docs.

---

## Local Setup

### Prerequisites

- Node.js 20
- pnpm 9+
- Docker + Docker Compose

### Install & Run

```bash
pnpm i

# bring up infra and apps
docker compose up -d

# generate prisma client and run migrations
pnpm -w prisma:generate
pnpm -w prisma:migrate:dev

# seed data
pnpm -w seed

# start dev servers (api at 3001, web at 3000)
pnpm -w dev
```

### Common Commands

```bash
pnpm -w build
pnpm -w lint
pnpm -w typecheck
pnpm -w test
pnpm -w test:unit
pnpm -w test:integration
pnpm -w test:e2e
```

---

## API Reference (Selected)

### GET `/games/live`

- Returns cached array of active games (`GameCore[]`).
- Cache TTL: 10–15s.

### GET `/games/:id`

- Returns a single game by ID; includes the latest score and status.

### POST `/games` (auth required)

Body:

```json
{
  "sport": "nba",
  "homeTeamId": "nba:LAL",
  "awayTeamId": "nba:GSW",
  "startsAt": "2024-10-18T02:00:00.000Z",
  "venue": "Staples Center"
}
```

### PATCH `/games/:id` (auth + ownership)

- Partial updates to hosted games (start time, venue, manual score in private environments).

### GET `/health`

- Checks: DB, Redis, adapters circuit state.

### GET `/metrics`

- Prometheus exposition format.

---

## Extending the System

### New Adapter Checklist

- Implement `SportAdapter` with robust normalization.
- Track upstream rate limits and enforce client-side throttling.
- Add mapping utilities for team IDs/names.
- Instrument with logs + metrics; add tests.

### New Frontend Feature

- Add route and components under `apps/web/src`.
- Use shared types from `packages/types`.
- Consume `/games` endpoints and Socket.IO events.

---

## Troubleshooting

- "Prisma client not found": run `pnpm -w prisma:generate`.
- Migrations failing: ensure Postgres is up; `docker compose logs db | cat`.
- Redis connection errors: verify `REDIS_URL` and container health.
- CORS issues: check API CORS config and web origin.
- OAuth callback errors: validate provider credentials and callback URLs.
- Socket not receiving updates: confirm room subscriptions and Redis adapter configuration.
- Stale `/games/live`: check BullMQ workers running and cache TTL.

---

## Appendix

### Scripts (suggested root package.json entries)

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel --filter ./apps/** dev",
    "build": "pnpm -r --filter ./apps/** build",
    "lint": "eslint .",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "seed": "ts-node scripts/seed/index.ts"
  }
}
```

### Performance Budget (initial)

- `/games/live` p95 < 200 ms (cold: < 400 ms)
- Socket event delivery p95 < 150 ms intra-node; < 300 ms cross-node
- RPS target: 500 sustained on `/games/live` with cache warm

---

If anything is unclear or you need help extending an area (new adapter, schema changes, or CI tweaks), open a PR with a draft and tag maintainers.

