import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AssignmentStatus } from '../src/domain/enums.js';
import { Patrol } from '../src/domain/Patrol.js';
import { PatrolAssignment } from '../src/domain/PatrolAssignment.js';
import { PatrolRoute } from '../src/domain/PatrolRoute.js';
import { Waypoint } from '../src/domain/Waypoint.js';
import { MongooseAssignmentRepository } from '../src/repositories/mongoose/MongooseAssignmentRepository.js';
import { MongoosePatrolRepository } from '../src/repositories/mongoose/MongoosePatrolRepository.js';
import { MongooseRouteRepository } from '../src/repositories/mongoose/MongooseRouteRepository.js';
import { AssignmentModel } from '../src/models/AssignmentModel.js';
import { PatrolModel } from '../src/models/PatrolModel.js';
import { RouteModel } from '../src/models/RouteModel.js';
import { toPatrolDomain, patrolToDto } from '../src/mappers/domainMappers.js';

const routeId = '7fa42db7-89e1-49ba-8bc7-bb4ddb3c2001';
const assignmentId = 'eb931813-178e-4974-b504-58c4ab4b3001';
const patrolId = 'a5c283bb-0415-45d2-9708-5b8c3c4a5001';
const rangerId = 'c9b84b3a-48eb-4f32-92e6-1dbba9a5f001';
const waypointId = '7d32b550-fccf-4cc5-a86d-9f91b1756001';

describe('Mongoose repositories', () => {
  let mongo;
  let routeRepository;
  let assignmentRepository;
  let patrolRepository;
  let route;
  let assignment;
  let patrol;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  beforeEach(async () => {
    await Promise.all([
      RouteModel.deleteMany({}),
      AssignmentModel.deleteMany({}),
      PatrolModel.deleteMany({}),
    ]);
    routeRepository = new MongooseRouteRepository();
    assignmentRepository = new MongooseAssignmentRepository();
    patrolRepository = new MongoosePatrolRepository();
    route = new PatrolRoute({
      routeId,
      routeName: 'River Loop',
      startPoint: 'North',
      endPoint: 'South',
      distance: 3.5,
      estimatedDuration: 90,
      expectedWaypoints: 1,
      routePoints: [{ latitude: 0, longitude: 0 }],
    });
    assignment = new PatrolAssignment({
      assignmentId,
      rangerId,
      assignedDate: '2025-01-01T00:00:00.000Z',
      status: AssignmentStatus.ASSIGNED,
      route,
    });
    patrol = new Patrol({
      patrolId,
      assignmentId,
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2025-01-01T01:00:00.000Z',
      status: 'COMPLETED',
      syncStatus: 'SYNCED',
      totalDistance: 1,
      waypoints: [
        new Waypoint({
          waypointId,
          latitude: 0,
          longitude: 0,
          altitude: 2,
          timestamp: '2025-01-01T00:30:00.000Z',
          type: 'AUTOMATIC',
        }),
      ],
    });
    await routeRepository.save(route);
    await assignmentRepository.save(assignment);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('saves and finds routes and assignments as domain objects', async () => {
    expect(await routeRepository.findById(routeId)).toMatchObject({
      routeName: 'River Loop',
    });
    expect(await assignmentRepository.findById(assignmentId)).toMatchObject({
      rangerId,
      route: { routeId },
    });
    expect(
      await assignmentRepository.findLatestByRangerId(rangerId),
    ).not.toBeNull();
  });

  test('atomically upserts patrolId and returns a domain object', async () => {
    await patrolRepository.upsertByPatrolId(patrol);
    await patrolRepository.upsertByPatrolId(patrol);
    expect(await PatrolModel.countDocuments({ patrolId })).toBe(1);
    expect(await patrolRepository.findById(patrolId)).toMatchObject({
      patrolId,
      waypoints: [{ waypointId }],
    });
    expect(await patrolRepository.findAll()).toHaveLength(1);
  });

  test('round-trips patrol mapper and strips Mongo fields from JSON', async () => {
    const saved = await PatrolModel.create(patrolToDto(patrol));
    expect(saved.toJSON()).not.toHaveProperty('_id');
    expect(saved.toJSON()).not.toHaveProperty('__v');
    expect(toPatrolDomain(saved)).toMatchObject({
      patrolId,
      waypoints: [{ waypointId, latitude: 0 }],
    });
  });
});
