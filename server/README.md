# CentralSystem — Ranger Patrol Management

Standalone Node.js 20+ backend for the Smart Wildlife Conservation and Anti-Poaching Monitoring System's **Manage Ranger Patrols** use case.

## Setup

From this directory:

```sh
npm install
Copy-Item .env.example .env
```

Set the environment values in `.env`:

| Variable        | Purpose                                 | Default                                             |
| --------------- | --------------------------------------- | --------------------------------------------------- |
| `MONGO_URI`     | MongoDB connection URI                  | `mongodb://127.0.0.1:27017/ecoguard-central-system` |
| `PORT`          | HTTP port                               | `5000`                                              |
| `CLIENT_ORIGIN` | The only browser origin allowed by CORS | `http://localhost:5173`                             |

Start MongoDB, then run `npm run seed` to create one Ranger, one Park Manager, two routes, and one assigned route. The seed command prints the UUIDs needed by clients. Seed identifiers and records are stable: running the command again updates those same seed records.

## Run

```sh
npm run dev
npm start
```

The server listens at `http://localhost:5000`. Send the seeded user's UUID in `X-User-Id`; no login/session/token workflow is implemented. Patrol-sync requests are rate limited. JSON request bodies are limited to 256 KB.

## Check with Postman

1. Start MongoDB (local MongoDB Community service or MongoDB Atlas) and set `MONGO_URI` in `.env`. The `.env.example` URI assumes a MongoDB server on `127.0.0.1:27017`; MongoDB must be installed/running separately.
2. In a terminal opened in `server/`, run `npm run seed` and confirm it prints the Ranger, Park Manager, route, and assignment IDs.
3. In a second terminal, run `npm run dev`. Wait for `CentralSystem listening on port 5000`.
4. In Postman, select **Import**, choose `postman/CentralSystem.postman_collection.json`, then run the requests in order. The imported collection contains the seeded UUIDs, sends the appropriate `X-User-Id` per role, and includes response assertions.
5. Start with **1. Health**. Expected response: `200 { "status": "ok" }`. If that works, continue through **8. Invalid sync returns validation errors**; its expected status is `400` with an `errors` array.

If a request reports `ECONNREFUSED`, confirm the backend is running and the URL uses port `5000`. If server startup or `npm run seed` reports a MongoDB connection error, start MongoDB or replace `MONGO_URI` with a reachable Atlas connection URI.

## Test and quality

```sh
npm test
npm run test:coverage
npm run lint
npm run format
```

Jest uses Supertest for HTTP coverage and `mongodb-memory-server` for repository integration tests. Statement, branch, function and line thresholds are all enforced at 80%.

## API endpoints

All endpoints are under `/api`; request and response bodies use JSON. Errors use `{ "code": "...", "message": "...", "errors": [] }` (the `errors` property is included for validation details).

| Method | Path                            | Caller                               | Success                                                                                               |
| ------ | ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| GET    | `/health`                       | Public                               | `200 { "status": "ok" }`                                                                              |
| GET    | `/rangers/:rangerId/assignment` | That Ranger (`X-User-Id` must match) | `200 PatrolAssignment`; `404 NO_ASSIGNED_ROUTE` when unassigned                                       |
| POST   | `/assignments`                  | Park Manager                         | `201 PatrolAssignment`; body: `{ rangerId, routeId, assignedDate }`                                   |
| GET    | `/routes`                       | Seeded Ranger or Park Manager        | `200 PatrolRoute[]`                                                                                   |
| POST   | `/patrols/sync`                 | Assigned Ranger                      | `200 { result: "SYNCED", patrolId }`; accepts only completed patrols and aggregates validation errors |
| GET    | `/patrols`                      | Park Manager                         | `200` list of synchronized patrol DTOs                                                                |
| GET    | `/patrols/:patrolId/coverage`   | Park Manager                         | `200` coverage report; `404` when the patrol is unknown                                               |

The patrol sync body must contain UUID v4 IDs, ISO timestamps, `COMPLETED` status, a valid end time, finite nonnegative distance, and a `waypoints` array. Waypoints require an ID, bounded latitude/longitude, finite altitude, timestamp, `AUTOMATIC` or `MANUAL` type, and description string; manual descriptions cannot be blank. Server sync status is always stored as `SYNCED`. Repeating a sync with the same `patrolId` atomically upserts one patrol record and completes its assignment.

## Assumptions

- `X-User-Id` identifies an already-seeded user; endpoint roles follow the use case (rangers retrieve their own assignment and sync their own patrols, park managers assign routes and review patrols).
- A ranger's assignment endpoint returns the most recently assigned route, whether its assignment status is `ASSIGNED`, `IN_PROGRESS`, or `COMPLETED`; a missing Ranger is distinct from an existing Ranger with no assignment.
- A patrol must reference an existing assignment, and its authenticated ranger must own that assignment.
- The contract requires dedicated UUID v4 fields; MongoDB's internal `_id` remains an implementation detail and is stripped by schema serialization transforms and domain mappers.
- `routePoints` is returned with route DTOs and is used as the expected coverage path. Coverage counts a point at exactly 50 metres as covered and rounds the percentage to one decimal.
- Coverage for an empty route is 0%; `neglectedPoints` is empty in that case.
- Duplicate patrol IDs are treated as synchronization retries. The latest valid request body is the value retained by the atomic upsert.
- The supplied route, user and assignment seed records use fixed UUIDs so clients can rely on the IDs printed by the seed script across repeat runs.

## Design patterns and architecture

- **Repository:** application services depend on documented JSDoc repository contracts. Runtime adapters use Mongoose; in-memory adapters support isolated service tests. Repository methods return domain objects, not Mongoose documents.
- **Factory Method:** `Waypoint.createAutoPoint()` and `Waypoint.createManualPoint()` validate and construct waypoints.
- **Strategy:** `CoverageService` accepts a `CoverageCalculator`; the default haversine implementation can be replaced without changing patrol or HTTP behavior.
- **Custom error hierarchy:** `ValidationError`, `NotFoundError`, `UnauthorizedError` and `ForbiddenError` flow through one middleware that maps them to stable HTTP codes and never returns stack traces.
- **Dependency inversion:** `createApp(deps)` receives services and repositories; `createMongooseDependencies()` is the runtime composition root.
- **Layers:** routes → HTTP-only controllers → application services → domain objects and repository interfaces.
