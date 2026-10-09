# EcoGuard Backend

REST API for the EcoGuard wildlife conservation system (SE3070 case study). It serves the mobile and web app in the `EcoGuard` repository.

Modules:

| Module | What it does |
|---|---|
| Auth | Sign-up, sign-in (bearer token), profile, role-based access |
| Incidents | Rangers report conservation incidents with photo evidence; offline reports sync safely |
| Ranger patrols | Managers plan routes and assign them; rangers start, track and sync patrols; route coverage |
| Wildlife conflict alerts | GPS collar positions raise alerts inside risk zones; community reports are verified first; acknowledge, respond, close |
| Analytics | Incident statistics, hotspots, patrol coverage, conflict trends; reports exported as PDF, CSV or Excel |
| Notifications | One inbox per user across all modules |

## Roles

`RANGER`, `COMMUNITY_LIAISON_OFFICER`, `PARK_MANAGER`, `CONSERVATION_RESEARCHER`, `VILLAGER`. Every route checks the role (see `middleware/roles.js` and the `Routes` folder).

## Run it

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGO_URI`, `JWT_SECRET`, `SESSION_SECRET` (Cloudinary keys are needed only for photo uploads). Data is stored in the database named by `MONGO_DB_NAME` (default `ecoguard_dev`), so it never mixes with other databases on the same cluster.
3. `npm run seed -- --reset` creates demo data: one account per role, animals with GPS collars, risk zones, alerts, community reports, incidents, patrol routes and past patrols.
4. `npm run serve` starts the API on `PORT` (5001 by default). Health check: `GET /api/health`.

Demo accounts (password `Eco@12345`):

| Role | Email |
|---|---|
| Ranger | ranger@ecoguard.lk, ranger2@ecoguard.lk |
| Community Liaison Officer | liaison@ecoguard.lk |
| Park Manager | manager@ecoguard.lk |
| Conservation Researcher | researcher@ecoguard.lk |
| Villager | villager@ecoguard.lk |

If `mongodb+srv://` fails with `querySrv ECONNREFUSED`, your network's DNS refuses SRV lookups. The server falls back to public DNS automatically (override with `DNS_SERVERS`).

## Check it

With the server running and freshly seeded:

```
npm run seed -- --reset
npm run smoke
```

`smoke` signs in as every role and exercises each module over HTTP (about 80 checks: permissions, alert creation from collar pings, report verification, patrol sync and idempotency, analytics and exports, incident offline sync). Run `seed -- --reset` again before repeating it.

`npm test` runs the Jest unit tests (they need `mongodb-memory-server`, which downloads a MongoDB binary on first use).

## Main endpoints

```
POST  /api/auth/signup | /signin | /signout     GET/PATCH /api/auth/me
GET   /api/users?role=RANGER                    (staff)

POST  /api/incidents  (multipart, rangers)      POST /api/incidents/sync     GET /api/incidents/my-reports | /map

GET   /api/patrol-routes                        POST /api/patrol-routes            (manager)
GET   /api/patrol-assignments/mine              POST /api/patrol-assignments       (manager)
POST  /api/patrols/start | /sync                POST /api/patrols/:id/waypoints
GET   /api/patrols                              GET  /api/patrols/:id/coverage

GET   /api/conflict-alerts?status=&mine=&active=
PATCH /api/conflict-alerts/:id/acknowledge | /reroute | /close
POST  /api/response-actions                     POST /api/response-actions/photos
PATCH /api/gps-collars/:id/location             (raises an alert inside a risk zone)
POST  /api/community-reports                    PATCH /api/community-reports/:id/status  (liaison verifies)
GET   /api/risk-zones | /gps-collars | /animals

POST  /api/analytics/analyze                    GET/POST/PUT /api/analytics/reports
GET   /api/analytics/reports/:id/export?format=PDF|CSV|XLSX
GET   /api/notifications                        PATCH /api/notifications/read-all
```
