# Security Incident Management API

Production-oriented REST API for security operations workflows: incidents, alerts, assets, JWT authentication, role-based access control, and immutable-style audit logging for mutating requests.

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **PostgreSQL** 14+ (local install, Docker, or managed service)
- **npm** (bundled with Node)

## Setup

1. Clone or copy this project and enter the directory:

   ```bash
   cd security-incident-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a database (example for `psql`):

   ```sql
   CREATE DATABASE security_incidents;
   ```

4. Copy environment template and edit values:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your PostgreSQL connection string and `JWT_SECRET` to a long random string (for example 32+ bytes from a password manager or `openssl rand -base64 32`).

5. Apply the schema and seed demo data:

   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

   If a migration named `init` already exists in `prisma/migrations/`, Prisma will apply it (or report that the database is up to date). On a greenfield database you can instead run `npx prisma migrate dev` once and use the existing migration folder as-is.

6. Start the server:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:3000` by default (override with `PORT` in `.env`).

### One-liner (after `.env` is configured)

```bash
npm install && npx prisma migrate dev --name init && npm run seed && npm run dev
```

## Run tests

Integration tests expect a reachable PostgreSQL database (same or dedicated test DB) with migrations applied and **seed data loaded** (they log in as `analyst@example.com`, `responder@example.com`, and `admin@example.com`).

```bash
export NODE_ENV=test
npx prisma migrate deploy
npm run seed
npm test
```

Use a separate `DATABASE_URL` in `.env` for tests if you want to avoid touching development data.

## API overview

| Method | Path | Auth | Roles |
|--------|------|------|--------|
| GET | `/health` | No | — |
| POST | `/auth/register` | No | — |
| POST | `/auth/login` | No | — |
| GET | `/incidents` | JWT | analyst+ |
| POST | `/incidents` | JWT | responder+ |
| GET | `/incidents/:id` | JWT | analyst+ |
| PATCH | `/incidents/:id` | JWT | responder+ |
| GET | `/incidents/:id/alerts` | JWT | analyst+ |
| POST | `/incidents/:id/alerts` | JWT | responder+ |
| GET | `/assets` | JWT | analyst+ |
| POST | `/assets` | JWT | responder+ |
| POST | `/incidents/:id/assets` | JWT | responder+ |
| GET | `/audit-logs` | JWT | admin |

**Seeded users** (password for all: `Password123!`):

- `analyst@example.com` — analyst  
- `responder@example.com` — responder  
- `admin@example.com` — admin  

## Example `curl` commands

Replace `TOKEN` with a JWT from `/auth/login`. Replace IDs with real UUIDs from your database.

### Health

```bash
curl -s http://localhost:3000/health
```

### Register

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","password":"Password123!","name":"New User"}'
```

### Login

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"responder@example.com","password":"Password123!"}'
```

### List incidents

```bash
curl -s http://localhost:3000/incidents \
  -H "Authorization: Bearer TOKEN"
```

### Create incident (responder or admin)

```bash
curl -s -X POST http://localhost:3000/incidents \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Suspicious outbound traffic",
    "description":"Beaconing observed from workstation subnet.",
    "severity":"high",
    "status":"open",
    "assigned_to":null
  }'
```

### Get incident

```bash
curl -s "http://localhost:3000/incidents/INCIDENT_UUID" \
  -H "Authorization: Bearer TOKEN"
```

### Update incident

```bash
curl -s -X PATCH "http://localhost:3000/incidents/INCIDENT_UUID" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"investigating"}'
```

### List alerts for an incident

```bash
curl -s "http://localhost:3000/incidents/INCIDENT_UUID/alerts" \
  -H "Authorization: Bearer TOKEN"
```

### Add alert to incident

```bash
curl -s -X POST "http://localhost:3000/incidents/INCIDENT_UUID/alerts" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source":"SIEM",
    "type":"correlation_rule",
    "raw_payload":{"rule_id":"SEC-9001","hits":12},
    "is_false_positive":false
  }'
```

### List assets

```bash
curl -s http://localhost:3000/assets \
  -H "Authorization: Bearer TOKEN"
```

### Create asset

```bash
curl -s -X POST http://localhost:3000/assets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hostname":"app-04.internal",
    "ip_address":"10.0.50.10",
    "type":"application_server",
    "owner":"Platform Team",
    "criticality":"high"
  }'
```

### Link asset to incident

```bash
curl -s -X POST "http://localhost:3000/incidents/INCIDENT_UUID/assets" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset_id":"ASSET_UUID"}'
```

### List audit logs (admin only)

```bash
curl -s "http://localhost:3000/audit-logs?limit=20&offset=0" \
  -H "Authorization: Bearer TOKEN"
```

## ASCII schema (entity relationships)

```
┌─────────────┐       reported_by        ┌─────────────┐
│    User     │───────────────────────────►│  Incident   │
│ id, email   │       assigned_to (opt)    │ title,      │
│ role, ...   │◄───────────────────────────│ severity,   │
└──────┬──────┘                            │ status, ... │
       │                                   └──────┬──────┘
       │ audit_logs                               │
       │         ┌─────────────┐                  │ 1:N
       │         │  AuditLog   │                  ▼
       └────────►│ user_id?    │            ┌─────────────┐
                 │ action,    │            │   Alert     │
                 │ target_*   │            │ incident_id │
                 └─────────────┘            └─────────────┘

┌─────────────┐       M:N via           ┌─────────────┐
│  Incident   │◄────IncidentAsset───────►│   Asset     │
└─────────────┘                         └─────────────┘
```

## Security decisions

### Why bcrypt instead of MD5 or SHA-256?

MD5 and single-round SHA family hashes are designed for speed. Attackers can try billions of guesses per second with GPUs. **bcrypt** is an adaptive password hash: it includes a salt (so identical passwords do not produce identical hashes) and a configurable work factor (here, 12 rounds), which sharply increases the cost of offline guessing. MD5/SHA used as raw password digests are inappropriate for credential storage.

### Why JWT expiry matters

A stolen JWT is a bearer token: anyone with it can act as that user until it expires. A short-lived access token (this API uses **8 hours**) bounds that window. Combined with HTTPS in deployment, compromise of a token is less damaging than a non-expiring secret. For higher assurance, pair short JWT lifetimes with refresh tokens and rotation policies.

### What the audit log protects against

The audit middleware records successful **POST**, **PATCH**, and **DELETE** operations with **who** (user id when authenticated), **what** (action and target type/id), and **context** (path, method, status, and structured metadata). That supports **non-repudiation** and **forensics**: detecting abuse of privileged accounts, reconstructing timelines after a breach, and meeting compliance expectations for sensitive changes. It does not replace database backups or tamper-evident storage, but it is a standard layer for operator accountability.

### How RBAC enforces least privilege

- **Analyst** can read operational data (incidents, alerts, assets) but cannot create or mutate records and **cannot** read audit logs. That limits blast radius if an analyst account is phished.
- **Responder** can manage the incident lifecycle and related alerts/assets but cannot enumerate global audit history, separating day-to-day response from compliance oversight.
- **Admin** retains full visibility, including audit logs, for governance.

The server enforces these rules on every request via middleware; JWT carries identity, and role checks run after authentication so clients cannot bypass restrictions by URL guessing alone.

## Project layout

See the repository tree: `prisma/` (schema, migrations, seed), `src/` (Express app, middleware, routes, controllers), and `tests/` (Jest + Supertest).
