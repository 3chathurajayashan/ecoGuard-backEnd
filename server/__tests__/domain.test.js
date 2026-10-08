import { describe, expect, test } from '@jest/globals';
import { Patrol } from '../src/domain/Patrol.js';
import { PatrolRoute } from '../src/domain/PatrolRoute.js';
import { Waypoint } from '../src/domain/Waypoint.js';
import { PatrolStatus, SyncStatus } from '../src/domain/enums.js';
import { ValidationError } from '../src/domain/errors.js';
import { User } from '../src/domain/User.js';
import { CoverageCalculator } from '../src/domain/CoverageCalculator.js';

const route = (routePoints) =>
  new PatrolRoute({
    routeId: 'route',
    routeName: 'Route',
    startPoint: 'North',
    endPoint: 'South',
    distance: 1,
    estimatedDuration: 60,
    expectedWaypoints: routePoints.length,
    routePoints,
  });

const patrolWithPoints = (waypoints) =>
  new Patrol({
    patrolId: 'patrol',
    assignmentId: 'assignment',
    startTime: '2025-01-01T00:00:00.000Z',
    waypoints,
  });

describe('Waypoint', () => {
  test('creates automatic and described manual points', () => {
    expect(Waypoint.createAutoPoint(90, -180, 3).type).toBe('AUTOMATIC');
    expect(
      Waypoint.createManualPoint(-90, 180, 0, 'Animal tracks').description,
    ).toBe('Animal tracks');
  });

  test('rejects missing manual description and invalid geographic bounds', () => {
    expect(() => Waypoint.createManualPoint(0, 0, 0, ' ')).toThrow(
      ValidationError,
    );
    for (const latitude of [-90.001, 90.001]) {
      expect(() => Waypoint.createAutoPoint(latitude, 0)).toThrow(
        ValidationError,
      );
    }
    for (const longitude of [-180.001, 180.001]) {
      expect(() => Waypoint.createAutoPoint(0, longitude)).toThrow(
        ValidationError,
      );
    }
    expect(
      Waypoint.validate({
        latitude: Number.NaN,
        longitude: Number.POSITIVE_INFINITY,
        altitude: Number.NaN,
        type: 'UNKNOWN',
      }),
    ).toHaveLength(4);
    expect(
      new Waypoint({ latitude: 0, longitude: 0, type: 'AUTOMATIC' }).waypointId,
    ).toBeTruthy();
  });
});

describe('Patrol', () => {
  test('uses defaults and can start at a supplied time', () => {
    const patrol = new Patrol({
      patrolId: 'patrol',
      assignmentId: 'assignment',
      startTime: '2025-01-01',
    });
    patrol.start('2025-01-02T00:00:00.000Z');
    expect(patrol.status).toBe(PatrolStatus.IN_PROGRESS);
    expect(patrol.endTime).toBeNull();
    expect(patrol.syncStatus).toBe(SyncStatus.PENDING_SYNC);
  });

  test('adds points, completes and toggles synchronization state', () => {
    const patrol = patrolWithPoints([]);
    const point = Waypoint.createAutoPoint(0, 0);
    patrol.addWaypoint(point);
    patrol.complete('2025-01-01T01:00:00.000Z');
    expect(patrol.waypoints).toContain(point);
    expect(patrol.status).toBe(PatrolStatus.COMPLETED);
    patrol.markSynced();
    expect(patrol.syncStatus).toBe(SyncStatus.SYNCED);
    patrol.markPendingSync();
    expect(patrol.syncStatus).toBe(SyncStatus.PENDING_SYNC);
  });

  describe('Shared domain utilities', () => {
    test('User is abstract and coverage calculator accepts a missing route', () => {
      expect(() => new User('id', 'name', 'role')).toThrow('User is abstract');
      expect(
        new CoverageCalculator().analyze(null, []).coveragePercentage,
      ).toBe(0);
    });
  });

  test('rejects completion before start', () => {
    const patrol = patrolWithPoints([]);
    expect(() => patrol.complete('2024-12-31T23:59:59.000Z')).toThrow(
      ValidationError,
    );
  });

  test('calculates full, partial, no and empty-route coverage', () => {
    const patrol = patrolWithPoints([Waypoint.createAutoPoint(0, 0)]);
    expect(
      patrol.calculateCoverage(route([{ latitude: 0, longitude: 0 }])),
    ).toBe(100);
    expect(
      patrol.calculateCoverage(
        route([
          { latitude: 0, longitude: 0 },
          { latitude: 1, longitude: 1 },
        ]),
      ),
    ).toBe(50);
    expect(
      patrolWithPoints([]).calculateCoverage(
        route([{ latitude: 1, longitude: 1 }]),
      ),
    ).toBe(0);
    expect(patrol.calculateCoverage(route([]))).toBe(0);
  });

  test('includes a route point exactly 50 metres away', () => {
    const patrol = patrolWithPoints([Waypoint.createAutoPoint(0, 0)]);
    const latitudeDelta = (50 / 6_371_000) * (180 / Math.PI);
    expect(
      patrol.calculateCoverage(
        route([{ latitude: latitudeDelta, longitude: 0 }]),
      ),
    ).toBe(100);
  });
});
