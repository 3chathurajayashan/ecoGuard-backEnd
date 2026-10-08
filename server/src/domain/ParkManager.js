import { User } from './User.js';

/**
 * Park manager account; actions are delegated to application services.
 */
export class ParkManager extends User {
  /**
   * @param {string} userId UUID of the manager.
   * @param {string} name Display name.
   */
  constructor(userId, name) {
    super(userId, name, 'PARK_MANAGER');
  }

  /**
   * Assigns a route through the injected assignment service.
   * @param {import('./Ranger.js').Ranger} ranger Ranger receiving assignment.
   * @param {import('./PatrolRoute.js').PatrolRoute} route Route to patrol.
   * @param {import('../services/AssignmentService.js').AssignmentService} assignmentService Application service.
   * @param {string} [assignedDate] Assignment date.
   * @returns {Promise<import('./PatrolAssignment.js').PatrolAssignment>} Created assignment.
   */
  assignPatrol(ranger, route, assignmentService, assignedDate) {
    return assignmentService.assignPatrol(ranger, route, assignedDate);
  }

  /**
   * Reviews patrol coverage through the injected coverage service.
   * @param {import('./Patrol.js').Patrol} patrol Patrol to review.
   * @param {import('../services/CoverageService.js').CoverageService} coverageService Application service.
   * @returns {Promise<object>} Coverage report.
   */
  reviewPatrolCoverage(patrol, coverageService) {
    return coverageService.reviewPatrolCoverage(patrol);
  }
}
