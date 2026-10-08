import { PatrolStatus, SyncStatus } from './enums.js';
import { CoverageCalculator } from './CoverageCalculator.js';
import { ValidationError } from './errors.js';

/**
 * Ranger patrol composed of its recorded waypoints.
 */
export class Patrol {
  /**
   * @param {object} data Patrol values.
   * @param {string} data.patrolId UUID.
   * @param {string} data.assignmentId UUID.
   * @param {string|Date} data.startTime Start time.
   * @param {string|Date|null} [data.endTime] End time.
   * @param {string} [data.status] Patrol status.
   * @param {string} [data.syncStatus] Synchronization status.
   * @param {number} [data.totalDistance=0] Distance in kilometres.
   * @param {import('./Waypoint.js').Waypoint[]} [data.waypoints] Composed waypoints.
   */
  constructor({
    patrolId,
    assignmentId,
    startTime,
    endTime = null,
    status = PatrolStatus.IN_PROGRESS,
    syncStatus = SyncStatus.PENDING_SYNC,
    totalDistance = 0,
    waypoints = [],
  }) {
    this.patrolId = patrolId;
    this.assignmentId = assignmentId;
    this.startTime = new Date(startTime);
    this.endTime = endTime ? new Date(endTime) : null;
    this.status = status;
    this.syncStatus = syncStatus;
    this.totalDistance = totalDistance;
    this.waypoints = [...waypoints];
  }

  /**
   * Starts an unstarted patrol.
   * @param {string|Date} [at] Start timestamp.
   * @returns {void}
   */
  start(at = new Date()) {
    this.startTime = new Date(at);
    this.endTime = null;
    this.status = PatrolStatus.IN_PROGRESS;
  }

  /**
   * Completes a patrol.
   * @param {string|Date} [at] Completion timestamp.
   * @returns {void}
   */
  complete(at = new Date()) {
    const endTime = new Date(at);
    if (Number.isNaN(endTime.getTime()) || endTime < this.startTime) {
      throw new ValidationError('endTime must be on or after startTime');
    }
    this.endTime = endTime;
    this.status = PatrolStatus.COMPLETED;
  }

  /**
   * Adds a validated waypoint to the patrol composition.
   * @param {import('./Waypoint.js').Waypoint} point Waypoint to add.
   * @returns {void}
   */
  addWaypoint(point) {
    this.waypoints.push(point);
  }

  /**
   * Marks this patrol as awaiting synchronization.
   * @returns {void}
   */
  markPendingSync() {
    this.syncStatus = SyncStatus.PENDING_SYNC;
  }

  /**
   * Marks this patrol synchronized.
   * @returns {void}
   */
  markSynced() {
    this.syncStatus = SyncStatus.SYNCED;
  }

  /**
   * Strategy: calculates the percentage of route points within 50 metres.
   * @param {import('./PatrolRoute.js').PatrolRoute} route Route to evaluate.
   * @returns {number} Coverage percentage rounded to one decimal.
   */
  calculateCoverage(route) {
    return new CoverageCalculator().calculate(route, this.waypoints);
  }
}
