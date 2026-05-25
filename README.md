# openlander-managed-demo

The demo that shows OpenLander's real differentiator: **your coding agent reads
the deploy control plane, provisions the infrastructure the app needs (managed
Postgres + Redis), wires it, and deploys — over MCP, no SSH, no compose.**

> **This is NOT a docker-compose demo.** The repo is a single app (one
> `Dockerfile`, **no compose at root**). Postgres and Redis are **OpenLander
> managed services your agent creates**, not containers this repo brings.
> A `local/docker-compose.local.yml` exists for *local laptop dev only* — it's
> under `local/` so OpenLander's planner never treats this repo as a compose stack.

The app requires `DATABASE_URL` **and** `REDIS_URL`. Missing either → crash-loop
with a clear log. Both wired → `/health` is `200`; `/` shows both connections
and a Redis-backed request counter (so you can *see* the managed services work).

## The demo prompt

Paste this to your agent (Claude Code / Cursor / …):

```
Deploy https://github.com/openlander-ai/openlander-managed-demo.
It needs PostgreSQL and Redis. Create the required managed services in
OpenLander, wire the env vars, deploy the app, verify /health, and give me the live URL.
```

## What you should see the agent do

1. Analyze the repo → determine it needs `DATABASE_URL` + `REDIS_URL`.
2. `openlander_managed_service.create_service` → **Postgres** (gets a connection string).
3. `openlander_managed_service.create_service` → **Redis** (gets a connection string).
4. `set_env_vars` → inject both into the app.
5. `deploy_app` / `redeploy_app`.
6. `diagnose_service` / `/health` → confirm both connected.
7. Dashboard shows the app **plus the connected managed services**, and the
   `sslip.io` URL serves the live page (refresh → request count climbs in Redis).

The point isn't "a compose file ran." It's: **the agent read the control plane,
created the infra inside OpenLander, and wired it — with risky steps held for
your approval, and truthful state reported back.**

## Local dev (optional)

```
docker compose -f local/docker-compose.local.yml up --build
# http://localhost:8080
```
