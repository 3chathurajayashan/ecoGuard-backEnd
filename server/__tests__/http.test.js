import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AssignmentService } from '../src/services/AssignmentService.js';
import { CoverageService } from '../src/services/CoverageService.js';
import { PatrolSyncService } from '../src/services/PatrolSyncService.js';
import { PatrolAssignment } from '../src/domain/PatrolAssignment.js';
import { PatrolRoute } from '../src/domain/PatrolRoute.js';
import { Ranger } from '../src/domain/Ranger.js';
import { ParkManager } from '../src/domain/ParkManager.js';
import {
  InMemoryAssignmentRepository,
  InMemoryPatrolRepository,
  InMemoryRouteRepository,
  InMemoryUserRepository,
} from '../src/repositories/inMemory/InMemoryRepositories.js';

const rangerId = 'c9b84b3a-48eb-4f32-92e6-1dbba9a5f001';
const managerId = '2f066090-4a1f-42ce-9a5b-6f3a7c7d1002';
const routeId = '7fa42db7-89e1-49ba-8bc7-bb4ddb3c2001';
const assignmentId = 'eb931813-178e-4974-b504-58c4ab4b3001';
const patrolId = 'a5c283bb-0415-45d2-9708-5b8c3c4a5001';
const waypointId = '7d32b550-fccf-4cc5-a86d-9f91b1756001';
const identityHeader = (id) => ({ 'X-User-Id': id });

function createDependencies() {
  const route = new PatrolRoute({
    routeId,
    routeName: 'River Loop',
    startPoint: 'North',
    endPoint: 'South',
    distance: 2,
    estimatedDuration: 60,
    expectedWaypoints: 2,
    routePoints: [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ],
  });
  const assignment = new PatrolAssignment({
    assignmentId,
    rangerId,
    assignedDate: '2025-01-01T00:00:00.000Z',
    route,
  });
  const routeRepository = new InMemoryRouteRepository([route]);
  const assignmentRepository = new InMemoryAssignmentRepository([assignment]);
  const patrolRepository = new InMemoryPatrolRepository();
  const userRepository = new InMemoryUserRepository([
    new Ranger(rangerId, 'Asha'),
    new ParkManager(managerId, 'Kiran'),
  ]);
  const assignmentService = new AssignmentService({
    assignmentRepository,
    routeRepository,
    userRepository,
  });
  return {
    routeRepository,
    assignmentRepository,
    patrolRepository,
    userRepository,
    assignmentService,
    patrolSyncService: new PatrolSyncService({
      patrolRepository,
      assignmentRepository,
      assignmentService,
    }),
    coverageService: new CoverageService({
      patrolRepository,
      assignmentRepository,
      routeRepository,
    }),
  };
}

function syncBody(overrides = {}) {
  return {
    patrolId,
    assignmentId,
    startTime: '2025-01-01T00:00:00.000Z',
    endTime: '2025-01-01T01:00:00.000Z',
    status: 'COMPLETED',
    syncStatus: 'PENDING_SYNC',
    totalDistance: 1,
    waypoints: [
      {
        waypointId,
        latitude: 0,
        longitude: 0,
        altitude: 5,
        timestamp: '2025-01-01T00:30:00.000Z',
        type: 'AUTOMATIC',
        description: '',
      },
    ],
    ...overrides,
  };
}

describe('HTTP contract', () => {
  let dependencies;
  let app;

  beforeEach(() => {
    dependencies = createDependencies();
    app = createApp(dependencies);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('health and routes return successful DTO responses', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    const routes = await request(app)
      .get('/api/routes')
      .set(identityHeader(managerId))
      .expect(200);
    expect(routes.body[0]).toMatchObject({ routeId, routeName: 'River Loop' });
    expect(routes.body[0]).not.toHaveProperty('_id');
  });

  test('ranger retrieves their assignment and E1 returns the specified 404 code', async () => {
    const response = await request(app)
      .get(`/api/rangers/${rangerId}/assignment`)
      .set(identityHeader(rangerId))
      .expect(200);
    expect(response.body).toMatchObject({
      assignmentId,
      rangerId,
      route: { routeId },
    });
    const unassignedId = '448bf008-54cc-4d4a-9ae5-773d30275001';
    await dependencies.userRepository.save(
      new Ranger(unassignedId, 'Unassigned'),
    );
    await request(app)
      .get(`/api/rangers/${unassignedId}/assignment`)
      .set(identityHeader(unassignedId))
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('NO_ASSIGNED_ROUTE'));
  });

  test('park manager assigns a route and caller role is enforced', async () => {
    const response = await request(app)
      .post('/api/assignments')
      .set(identityHeader(managerId))
      .send({ rangerId, routeId, assignedDate: '2025-02-01T00:00:00.000Z' })
      .expect(201);
    expect(response.body).toMatchObject({
      rangerId,
      route: { routeId },
      status: 'ASSIGNED',
    });
    await request(app)
      .post('/api/assignments')
      .set(identityHeader(rangerId))
      .send({ rangerId, routeId, assignedDate: '2025-02-01T00:00:00.000Z' })
      .expect(403);
  });

  test('syncs idempotently, lists synced patrols and serves coverage', async () => {
    const syncPath = '/api/patrols/sync';
    const sync = await request(app)
      .post(syncPath)
      .set(identityHeader(rangerId))
      .send(syncBody())
      .expect(200);
    expect(sync.body).toEqual({ result: 'SYNCED', patrolId });
    await request(app)
      .post(syncPath)
      .set(identityHeader(rangerId))
      .send(syncBody())
      .expect(200);
    const list = await request(app)
      .get('/api/patrols')
      .set(identityHeader(managerId))
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].syncStatus).toBe('SYNCED');
    const coverage = await request(app)
      .get(`/api/patrols/${patrolId}/coverage`)
      .set(identityHeader(managerId))
      .expect(200);
    expect(coverage.body).toMatchObject({
      patrolId,
      coveragePercentage: 50,
      coveredPoints: 1,
      neglectedPoints: [{ latitude: 1, longitude: 1 }],
    });
  });

  test('returns 400 with all validation errors for malformed patrol data', async () => {
    const invalid = syncBody({
      patrolId: 'not-a-uuid',
      status: 'IN_PROGRESS',
      waypoints: [
        { ...syncBody().waypoints[0], latitude: 99, longitude: -181 },
      ],
    });
    const response = await request(app)
      .post('/api/patrols/sync')
      .set(identityHeader(rangerId))
      .send(invalid)
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.errors.length).toBeGreaterThanOrEqual(4);
    expect(response.body).not.toHaveProperty('stack');
  });

  test('returns 404 for unknown patrol and 401 for missing identity', async () => {
    const unknownId = 'fe6d202b-8ad3-405b-aa86-63393a6b8001';
    await request(app)
      .get(`/api/patrols/${unknownId}/coverage`)
      .set(identityHeader(managerId))
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('NOT_FOUND'));
    await request(app).get('/api/routes').expect(401);
    await request(app)
      .get('/api/patrols/not-a-uuid/coverage')
      .set(identityHeader(managerId))
      .expect(400);
  });

  test('maps unexpected failures without returning a stack trace', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    dependencies.routeRepository.findAll = async () => {
      throw new Error('private internal detail');
    };
    const errorApp = createApp(dependencies);
    const response = await request(errorApp)
      .get('/api/routes')
      .set(identityHeader(managerId))
      .expect(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'private internal detail',
    );
    expect(log).toHaveBeenCalled();
  });
});
