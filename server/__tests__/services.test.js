import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AssignmentService } from '../src/services/AssignmentService.js';
import { PatrolSyncService } from '../src/services/PatrolSyncService.js';
import { CoverageService } from '../src/services/CoverageService.js';
import {
  validateSyncPatrol,
  validateUuidParam,
} from '../src/validators/patrolValidators.js';
import { PatrolRoute } from '../src/domain/PatrolRoute.js';
import { PatrolAssignment } from '../src/domain/PatrolAssignment.js';
import { Ranger } from '../src/domain/Ranger.js';
import { ParkManager } from '../src/domain/ParkManager.js';
import { Waypoint } from '../src/domain/Waypoint.js';
import { PatrolRoute as Route } from '../src/domain/PatrolRoute.js';
import {
  InMemoryAssignmentRepository,
  InMemoryPatrolRepository,
  InMemoryRouteRepository,
  InMemoryUserRepository,
} from '../src/repositories/inMemory/InMemoryRepositories.js';
import { NotFoundError, ValidationError } from '../src/domain/errors.js';

const rangerId = 'c9b84b3a-48eb-4f32-92e6-1dbba9a5f001';
const managerId = '2f066090-4a1f-42ce-9a5b-6f3a7c7d1002';
const routeId = '7fa42db7-89e1-49ba-8bc7-bb4ddb3c2001';
const assignmentId = 'eb931813-178e-4974-b504-58c4ab4b3001';
const patrolId = 'a5c283bb-0415-45d2-9708-5b8c3c4a5001';
const waypointId = '7d32b550-fccf-4cc5-a86d-9f91b1756001';

function createFixture() {
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
    new Ranger(rangerId, 'Ranger'),
    new ParkManager(managerId, 'Manager'),
  ]);
  const assignmentService = new AssignmentService({
    assignmentRepository,
    routeRepository,
    userRepository,
  });
  return {
    route,
    assignment,
    routeRepository,
    assignmentRepository,
    patrolRepository,
    userRepository,
    assignmentService,
  };
}

function validPatrol(overrides = {}) {
  return {
    patrolId,
    assignmentId,
    startTime: '2025-01-01T00:00:00.000Z',
    endTime: '2025-01-01T01:00:00.000Z',
    status: 'COMPLETED',
    syncStatus: 'PENDING_SYNC',
    totalDistance: 1.2,
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

describe('PatrolSyncService', () => {
  let fixture;
  let service;

  beforeEach(() => {
    fixture = createFixture();
    service = new PatrolSyncService({
      patrolRepository: fixture.patrolRepository,
      assignmentRepository: fixture.assignmentRepository,
      assignmentService: fixture.assignmentService,
    });
  });

  test('stores a completed patrol as synced and completes its assignment', async () => {
    await expect(
      service.receivePatrol(validPatrol(), rangerId),
    ).resolves.toEqual({
      result: 'SYNCED',
      patrolId,
    });
    expect(fixture.patrolRepository.patrols.size).toBe(1);
    expect((await fixture.patrolRepository.findById(patrolId)).syncStatus).toBe(
      'SYNCED',
    );
    expect(
      (await fixture.assignmentRepository.findById(assignmentId)).status,
    ).toBe('COMPLETED');
  });

  test('same patrol id is stored once on repeated sync', async () => {
    await service.receivePatrol(validPatrol(), rangerId);
    await service.receivePatrol(validPatrol(), rangerId);
    expect(fixture.patrolRepository.patrols.size).toBe(1);
  });

  test('rejects incomplete patrols and end time before start time', async () => {
    await expect(
      service.receivePatrol(validPatrol({ status: 'IN_PROGRESS' }), rangerId),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.receivePatrol(
        validPatrol({ endTime: '2024-12-31T23:59:59.000Z' }),
        rangerId,
      ),
    ).rejects.toThrow(/Request validation failed/);
  });

  test('reports every invalid waypoint field together', async () => {
    const invalid = validPatrol({
      waypoints: [
        {
          ...validPatrol().waypoints[0],
          latitude: 91,
          longitude: -181,
          type: 'MANUAL',
          description: '',
        },
      ],
    });
    await expect(
      service.receivePatrol(invalid, rangerId),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        expect.stringContaining('latitude'),
        expect.stringContaining('longitude'),
        expect.stringContaining('description'),
      ]),
    });
  });

  test('surfaces repository failures and rejects another ranger assignment', async () => {
    fixture.patrolRepository.upsertByPatrolId = jest
      .fn()
      .mockRejectedValue(new Error('database unavailable'));
    await expect(
      service.receivePatrol(validPatrol(), rangerId),
    ).rejects.toThrow('database unavailable');
    await expect(
      service.receivePatrol(validPatrol(), managerId),
    ).rejects.toThrow(ValidationError);
  });

  test('rejects unknown assignments and root-level invalid request bodies', async () => {
    await expect(
      service.receivePatrol(
        validPatrol({ assignmentId: 'd50f2e04-5868-4c56-a0ab-67d4e8062002' }),
        rangerId,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(() => validateSyncPatrol(null)).toThrow(ValidationError);
    expect(validateUuidParam(patrolId)).toBe(patrolId);
    expect(() => validateUuidParam('wrong-id')).toThrow(ValidationError);
  });
});

describe('AssignmentService', () => {
  test('assigns a route and loads the latest ranger assignment', async () => {
    const fixture = createFixture();
    const created = await fixture.assignmentService.assignPatrol(
      { userId: rangerId },
      { routeId },
      '2025-02-01T00:00:00.000Z',
    );
    expect(created.route.routeId).toBe(routeId);
    expect(
      await fixture.assignmentService.getAssignmentForRanger(
        rangerId,
        rangerId,
      ),
    ).toBe(created);
    const manager = new ParkManager(managerId, 'Manager');
    expect(
      await manager.assignPatrol(
        new Ranger(rangerId, 'Ranger'),
        fixture.route,
        fixture.assignmentService,
      ),
    ).toMatchObject({ rangerId, route: { routeId } });
  });

  test('reports ranger with no assignment and unknown ranger or route', async () => {
    const fixture = createFixture();
    const noAssignmentService = new AssignmentService({
      ...fixture,
      assignmentRepository: new InMemoryAssignmentRepository(),
    });
    await expect(
      noAssignmentService.getAssignmentForRanger(rangerId, rangerId),
    ).rejects.toMatchObject({ code: 'NO_ASSIGNED_ROUTE' });
    await expect(
      fixture.assignmentService.assignPatrol(
        { userId: 'unknown' },
        { routeId },
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      fixture.assignmentService.assignPatrol(
        { userId: rangerId },
        { routeId: 'unknown' },
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      fixture.assignmentService.getAssignmentForRanger(rangerId),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      fixture.assignmentService.getAssignmentForRanger(rangerId, managerId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      fixture.assignmentService.getAssignmentForRanger('unknown', 'unknown'),
    ).rejects.toThrow(NotFoundError);
    await expect(
      fixture.assignmentService.assignPatrol(null, { routeId }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      fixture.assignmentService.assignPatrol({ userId: rangerId }, null),
    ).rejects.toThrow(NotFoundError);
    await expect(
      fixture.assignmentService.assignPatrol(
        { userId: rangerId },
        { routeId },
        'not-a-date',
      ),
    ).rejects.toThrow(ValidationError);
    await expect(
      fixture.assignmentService.completeAssignment('missing'),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('CoverageService', () => {
  test('returns the coverage report and identifies neglected route points', async () => {
    const fixture = createFixture();
    const patrol = {
      patrolId,
      assignmentId,
      waypoints: [Waypoint.createAutoPoint(0, 0)],
    };
    await fixture.patrolRepository.upsertByPatrolId(patrol);
    const coverage = new CoverageService({
      patrolRepository: fixture.patrolRepository,
      assignmentRepository: fixture.assignmentRepository,
      routeRepository: fixture.routeRepository,
    });
    await expect(
      coverage.reviewPatrolCoverage(patrolId),
    ).resolves.toMatchObject({
      patrolId,
      coveragePercentage: 50,
      coveredPoints: 1,
      neglectedPoints: [{ latitude: 1, longitude: 1 }],
    });
    await expect(coverage.reviewPatrolCoverage(patrol)).resolves.toMatchObject({
      patrolId,
    });
    await expect(
      new ParkManager(managerId, 'Manager').reviewPatrolCoverage(
        patrol,
        coverage,
      ),
    ).resolves.toMatchObject({ patrolId });
  });

  test('reports missing patrol, assignment and route resources', async () => {
    const fixture = createFixture();
    const coverage = new CoverageService({
      patrolRepository: fixture.patrolRepository,
      assignmentRepository: fixture.assignmentRepository,
      routeRepository: fixture.routeRepository,
    });
    await expect(coverage.reviewPatrolCoverage(patrolId)).rejects.toThrow(
      NotFoundError,
    );
    const patrol = { patrolId, assignmentId, waypoints: [] };
    fixture.patrolRepository.patrols.set(patrolId, patrol);
    fixture.assignmentRepository.assignments.clear();
    await expect(coverage.reviewPatrolCoverage(patrolId)).rejects.toThrow(
      NotFoundError,
    );
    fixture.assignmentRepository.assignments.set(assignmentId, {
      assignmentId,
      route: new Route({
        routeId: 'd50f2e04-5868-4c56-a0ab-67d4e8062002',
        routeName: 'Unavailable',
        startPoint: 'A',
        endPoint: 'B',
        distance: 0,
        estimatedDuration: 0,
        expectedWaypoints: 0,
      }),
    });
    await expect(coverage.reviewPatrolCoverage(patrolId)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('In-memory repository edge cases', () => {
  test('supports empty stores and missing lookup results', async () => {
    const routes = new InMemoryRouteRepository();
    const assignments = new InMemoryAssignmentRepository();
    const patrols = new InMemoryPatrolRepository();
    const users = new InMemoryUserRepository();
    expect(await routes.findAll()).toEqual([]);
    expect(await routes.findById(routeId)).toBeNull();
    expect(await assignments.findLatestByRangerId(rangerId)).toBeNull();
    expect(await assignments.findById(assignmentId)).toBeNull();
    expect(await patrols.findById(patrolId)).toBeNull();
    expect(await patrols.findAll()).toEqual([]);
    expect(await users.findById(rangerId)).toBeNull();
    await assignments.updateStatus(assignmentId, 'COMPLETED');
  });
});
