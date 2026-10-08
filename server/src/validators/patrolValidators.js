import { z } from 'zod';
import { PatrolStatus, SyncStatus, WaypointType } from '../domain/enums.js';
import { ValidationError } from '../domain/errors.js';
import { unwrapValidation, uuidV4Schema } from './common.js';

const isoDateSchema = z.string().datetime({ offset: true });

const waypointSchema = z
  .object({
    waypointId: uuidV4Schema,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    altitude: z.number().finite(),
    timestamp: isoDateSchema,
    type: z.nativeEnum(WaypointType),
    description: z.string(),
  })
  .superRefine((waypoint, context) => {
    if (waypoint.type === WaypointType.MANUAL && !waypoint.description.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'description is required for a MANUAL waypoint',
      });
    }
  });

const syncPatrolSchema = z
  .object({
    patrolId: uuidV4Schema,
    assignmentId: uuidV4Schema,
    startTime: isoDateSchema,
    endTime: isoDateSchema,
    status: z.nativeEnum(PatrolStatus),
    syncStatus: z.nativeEnum(SyncStatus),
    totalDistance: z.number().finite().min(0),
    waypoints: z.array(waypointSchema),
  })
  .superRefine((patrol, context) => {
    if (patrol.status !== PatrolStatus.COMPLETED) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'status must be COMPLETED',
      });
    }
    if (new Date(patrol.endTime) < new Date(patrol.startTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be on or after startTime',
      });
    }
  });

/**
 * Validates all sync DTO fields and returns all failures together.
 * @param {unknown} body Untrusted request body.
 * @returns {object} Valid patrol DTO.
 */
export function validateSyncPatrol(body) {
  return unwrapValidation(syncPatrolSchema.safeParse(body));
}

const assignmentBodySchema = z.object({
  rangerId: uuidV4Schema,
  routeId: uuidV4Schema,
  assignedDate: isoDateSchema,
});

/**
 * Validates route assignment request fields.
 * @param {unknown} body Untrusted request body.
 * @returns {{rangerId:string,routeId:string,assignedDate:string}} Valid request.
 */
export function validateAssignmentBody(body) {
  return unwrapValidation(assignmentBodySchema.safeParse(body));
}

/**
 * Validates a UUID path parameter.
 * @param {unknown} value Untrusted identifier.
 * @param {string} name Parameter name for error messages.
 * @returns {string} Valid UUID v4.
 */
export function validateUuidParam(value, name = 'id') {
  const result = uuidV4Schema.safeParse(value);
  if (result.success) return result.data;
  throw new ValidationError('Request validation failed', [
    `${name} must be a UUID v4`,
  ]);
}
