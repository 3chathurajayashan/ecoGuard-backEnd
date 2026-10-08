import { AssignmentStatus } from './enums.js';

/**
 * Associates a ranger with a route.
 */
export class PatrolAssignment {
  /**
   * @param {object} data Assignment values.
   */
  constructor({
    assignmentId,
    rangerId,
    assignedDate,
    status = AssignmentStatus.ASSIGNED,
    route,
  }) {
    this.assignmentId = assignmentId;
    this.rangerId = rangerId;
    this.assignedDate = new Date(assignedDate);
    this.status = status;
    this.route = route;
  }

  /**
   * Gets the patrol route assigned.
   * @returns {PatrolRoute} Assigned route.
   */
  getRoute() {
    return this.route;
  }
}
