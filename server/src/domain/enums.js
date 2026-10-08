/** Frozen patrol lifecycle values. */
export const PatrolStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

/** Frozen synchronization lifecycle values. */
export const SyncStatus = Object.freeze({
  PENDING_SYNC: 'PENDING_SYNC',
  SYNCED: 'SYNCED',
});

/** Frozen waypoint source values. */
export const WaypointType = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
});

/** Frozen patrol assignment lifecycle values. */
export const AssignmentStatus = Object.freeze({
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});
