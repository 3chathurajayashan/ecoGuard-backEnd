import { Patrol } from '../domain/Patrol.js';
import { PatrolAssignment } from '../domain/PatrolAssignment.js';
import { PatrolRoute } from '../domain/PatrolRoute.js';
import { Ranger } from '../domain/Ranger.js';
import { ParkManager } from '../domain/ParkManager.js';
import { Waypoint } from '../domain/Waypoint.js';

const plain = (document) =>
  typeof document?.toObject === 'function'
    ? document.toObject({ transform: false })
    : document;

/**
 * Converts a route document or DTO to its domain representation.
 * @param {object} document Route data.
 * @returns {PatrolRoute} Route domain object.
 */
export function toRouteDomain(document) {
  return new PatrolRoute(plain(document));
}

/**
 * Converts a route domain object to a transport/storage DTO.
 * @param {PatrolRoute|object} route Route data.
 * @returns {object} Route DTO.
 */
export function routeToDto(route) {
  return {
    routeId: route.routeId,
    routeName: route.routeName,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    distance: route.distance,
    estimatedDuration: route.estimatedDuration,
    expectedWaypoints: route.expectedWaypoints,
    routePoints: (route.routePoints ?? []).map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    })),
  };
}

/**
 * Converts an assignment record and resolved route to its domain object.
 * @param {object} document Assignment data.
 * @param {PatrolRoute|object} route Resolved route.
 * @returns {PatrolAssignment} Assignment domain object.
 */
export function toAssignmentDomain(document, route) {
  return new PatrolAssignment({ ...plain(document), route });
}

/**
 * Converts an assignment domain object to its public DTO.
 * @param {PatrolAssignment|object} assignment Assignment data.
 * @returns {object} Assignment DTO.
 */
export function assignmentToDto(assignment) {
  return {
    assignmentId: assignment.assignmentId,
    rangerId: assignment.rangerId,
    assignedDate: new Date(assignment.assignedDate).toISOString(),
    status: assignment.status,
    route: routeToDto(assignment.route),
  };
}

/**
 * Converts a patrol record to its domain representation.
 * @param {object} document Patrol data.
 * @returns {Patrol} Patrol domain object.
 */
export function toPatrolDomain(document) {
  const data = plain(document);
  return new Patrol({
    ...data,
    waypoints: (data.waypoints ?? []).map((waypoint) => new Waypoint(waypoint)),
  });
}

/**
 * Converts a patrol domain object to its public DTO.
 * @param {Patrol|object} patrol Patrol data.
 * @returns {object} Patrol DTO.
 */
export function patrolToDto(patrol) {
  return {
    patrolId: patrol.patrolId,
    assignmentId: patrol.assignmentId,
    startTime: new Date(patrol.startTime).toISOString(),
    endTime: patrol.endTime ? new Date(patrol.endTime).toISOString() : null,
    status: patrol.status,
    syncStatus: patrol.syncStatus,
    totalDistance: patrol.totalDistance,
    waypoints: patrol.waypoints.map((waypoint) => ({
      waypointId: waypoint.waypointId,
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      altitude: waypoint.altitude,
      timestamp: new Date(waypoint.timestamp).toISOString(),
      type: waypoint.type,
      description: waypoint.description,
    })),
  };
}

/**
 * Converts a user record into its role-specific domain object.
 * @param {object} document User data.
 * @returns {Ranger|ParkManager|null} User domain object.
 */
export function toUserDomain(document) {
  if (!document) return null;
  const data = plain(document);
  return data.role === 'RANGER'
    ? new Ranger(data.userId, data.name)
    : new ParkManager(data.userId, data.name);
}
