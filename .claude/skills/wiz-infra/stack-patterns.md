# Stack Detection Patterns

Use these patterns to identify technologies from file names, imports, and config values.

---

## Runtime Detection

### Node.js
- Files: `package.json`, `*.js`, `*.ts`, `*.mjs`
- Version: `"node": ">=20"` in `package.json` engines, `.nvmrc`, `.node-version`, `Dockerfile` FROM node:*

### Python
- Files: `pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile`, `*.py`
- Version: `python_requires`, `.python-version`, `Dockerfile` FROM python:*

### Go
- Files: `go.mod`, `go.sum`, `*.go`
- Version: `go 1.22` in `go.mod`

### Java / JVM
- Files: `pom.xml`, `build.gradle`, `*.java`, `*.kt`
- Version: `java.version` in pom, `Dockerfile` FROM eclipse-temurin:*

### Rust
- Files: `Cargo.toml`, `Cargo.lock`, `*.rs`

### Ruby
- Files: `Gemfile`, `Gemfile.lock`, `.ruby-version`, `*.rb`

---

## Framework Detection

### Frontend

| Framework | Detection signals |
|-----------|------------------|
| Next.js | `next` in dependencies, `next.config.*`, `app/` or `pages/` dir |
| Nuxt | `nuxt` in dependencies, `nuxt.config.*` |
| SvelteKit | `@sveltejs/kit`, `svelte.config.*` |
| Remix | `@remix-run/*`, `remix.config.*` |
| Vite SPA (React/Vue) | `vite` in devDeps, no SSR framework detected |
| Angular | `@angular/core`, `angular.json` |
| Astro | `astro` in deps, `astro.config.*` |
| Gatsby | `gatsby` in deps, `gatsby-config.*` |

**SSR vs SPA decision:**
- SSR: Next.js (App Router or Pages with `getServerSideProps`), Nuxt, SvelteKit, Remix, Astro (SSR mode)
- SSG/ISR: Next.js with only `getStaticProps`/`generateStaticParams`, Astro (static mode)
- SPA: Vite + React/Vue/Svelte with no server, CRA, Angular (no Universal)

### Backend

| Framework | Detection signals |
|-----------|------------------|
| Express | `express` in deps |
| Fastify | `fastify` in deps |
| NestJS | `@nestjs/core` in deps, `nest-cli.json` |
| Hono | `hono` in deps |
| tRPC | `@trpc/server` in deps |
| FastAPI | `fastapi` in requirements, `@app.get` pattern in `*.py` |
| Django | `django` in requirements, `manage.py`, `settings.py` |
| Flask | `flask` in requirements |
| Gin | `github.com/gin-gonic/gin` in `go.mod` |
| Fiber | `github.com/gofiber/fiber` in `go.mod` |
| Echo | `github.com/labstack/echo` in `go.mod` |
| Spring Boot | `spring-boot-starter` in `pom.xml` or `build.gradle` |
| Rails | `rails` in `Gemfile` |

---

## Database Detection

### PostgreSQL
- npm: `pg`, `postgres`, `@neondatabase/serverless`, `drizzle-orm` (with pg adapter), `prisma` (provider = "postgresql")
- python: `psycopg2`, `psycopg`, `asyncpg`, `sqlalchemy` + postgresql URL
- go: `github.com/lib/pq`, `github.com/jackc/pgx`
- env hints: `DATABASE_URL=postgres://`, `POSTGRES_*`

### MySQL / MariaDB
- npm: `mysql2`, `mysql`, `@planetscale/database`
- python: `mysqlclient`, `aiomysql`, `pymysql`
- env hints: `DATABASE_URL=mysql://`, `MYSQL_*`

### SQLite
- npm: `better-sqlite3`, `@libsql/client`, `sqlite3`
- python: `sqlite3` (stdlib), `aiosqlite`
- files: `*.db`, `*.sqlite`
- Note: SQLite means stateful — cannot run multiple instances without distributed FS

### MongoDB
- npm: `mongoose`, `mongodb`
- python: `pymongo`, `motor`
- env hints: `MONGODB_URI`, `MONGO_URL`

### Redis
- npm: `ioredis`, `redis`, `@upstash/redis`
- python: `redis`, `aioredis`
- go: `github.com/redis/go-redis`
- env hints: `REDIS_URL`, `REDIS_*`

### Elasticsearch / OpenSearch
- npm: `@elastic/elasticsearch`, `@opensearch-project/opensearch`
- python: `elasticsearch`, `opensearch-py`

### ORM / Query Builder
| ORM | Signals |
|-----|---------|
| Prisma | `@prisma/client`, `prisma/schema.prisma` |
| Drizzle | `drizzle-orm`, `drizzle.config.*` |
| TypeORM | `typeorm`, `@Entity()` decorator usage |
| Sequelize | `sequelize` |
| SQLAlchemy | `sqlalchemy` |
| Tortoise ORM | `tortoise-orm` |
| GORM | `gorm.io/gorm` |

---

## File Storage Detection

| Signal | Technology |
|--------|-----------|
| `@aws-sdk/client-s3`, `aws-sdk` (S3) | Amazon S3 |
| `@google-cloud/storage` | Google Cloud Storage |
| `@azure/storage-blob` | Azure Blob Storage |
| `firebase-admin` storage methods | Firebase Storage |
| `@supabase/supabase-js` + storage | Supabase Storage |
| `multer`, `formidable`, `busboy` | File upload (check where files go) |
| `sharp`, `jimp`, `@squoosh/*` | Image processing (implies storage) |
| `uploadthing`, `@uploadthing/*` | UploadThing |

---

## Auth Detection

| Signal | Library |
|--------|---------|
| `next-auth`, `@auth/core` | NextAuth / Auth.js |
| `better-auth` | Better Auth |
| `lucia` | Lucia Auth |
| `@clerk/nextjs`, `@clerk/clerk-sdk-node` | Clerk |
| `@supabase/auth-helpers-*` | Supabase Auth |
| `firebase-admin` auth | Firebase Auth |
| `passport` | Passport.js |
| `jsonwebtoken`, `jose`, `@auth0/auth0-spa-js` | Custom JWT / Auth0 |
| `@supertokens/*` | SuperTokens |
| `keycloak-connect` | Keycloak |

---

## Background Jobs / Queue Detection

| Signal | Technology |
|--------|-----------|
| `bullmq` | BullMQ (Redis-backed) |
| `bull` | Bull (Redis-backed, legacy) |
| `bee-queue` | Bee Queue |
| `pg-boss` | pg-boss (Postgres-backed) |
| `celery` | Celery (Python) |
| `rq` | RQ (Python Redis Queue) |
| `sidekiq` | Sidekiq (Ruby) |
| `node-cron`, `cron`, `croner` | Cron job in-process |
| `@google-cloud/pubsub` | Pub/Sub consumer |
| `kafkajs`, `node-rdkafka` | Kafka consumer |

---

## WebSocket / Realtime Detection

| Signal | Technology |
|--------|-----------|
| `socket.io` | Socket.IO (WS) |
| `ws` | Raw WebSocket server |
| `ably`, `@ably/ably` | Ably |
| `pusher`, `pusher-js` | Pusher |
| `@supabase/realtime-js` | Supabase Realtime |
| SSE: `res.writeHead(200, {'Content-Type': 'text/event-stream'})` | Server-Sent Events |

---

## Memory & CPU Estimation Heuristics

### CPU
| Scenario | Estimate |
|----------|----------|
| Simple REST API, mostly DB queries | Low (0.25–0.5 vCPU) |
| SSR frontend with data fetching | Low–Medium (0.5–1 vCPU) |
| REST API with image processing / PDF gen | Medium–High (1–2 vCPU) |
| ML inference, video processing | High (2–4+ vCPU) |
| Background worker (queue consumer) | Low (0.25 vCPU) |

### Memory
| Scenario | Estimate |
|----------|----------|
| Node.js API, no heavy data in RAM | 256–512 MB |
| Next.js SSR | 512 MB–1 GB |
| Python FastAPI / Flask | 256–512 MB |
| Django (with ORM, templates) | 512 MB–1 GB |
| JVM (Spring Boot, min heap) | 512 MB–1 GB (min), 1–2 GB (comfortable) |
| Go API | 128–256 MB |
| Rust API | 64–256 MB |
| Redis cache | size of hot dataset + 20% overhead |
| Worker with in-memory job data | 256–512 MB |

### Startup time
| Runtime | Cold start | Impact |
|---------|------------|--------|
| Go, Rust | < 50ms | Negligible — fine to scale to zero |
| Node.js (small) | 200–500ms | Fine for most use cases |
| Node.js (NestJS / large) | 1–3s | Consider min-instances=1 |
| Python (FastAPI) | 500ms–2s | Fine for most |
| Python (Django + heavy deps) | 2–5s | Consider min-instances=1 |
| JVM (Spring Boot) | 5–15s | Must keep warm — min-instances=1+ |
