import { assignmentToDto } from '../mappers/domainMappers.js';
import {
  validateAssignmentBody,
  validateUuidParam,
} from '../validators/patrolValidators.js';

/**
 * HTTP adapter for ranger and manager assignment endpoints.
 */
export class AssignmentController {
  /**
   * @param {import('../services/AssignmentService.js').AssignmentService} assignmentService Assignment service.
   */
  constructor(assignmentService) {
    this.assignmentService = assignmentService;
  }

  /**
   * @param {import('express').Request} request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes the assignment response.
   */
  async getRangerAssignment(request, response) {
    const rangerId = validateUuidParam(request.params.rangerId, 'rangerId');
    const assignment = await this.assignmentService.getAssignmentForRanger(
      rangerId,
      request.get('X-User-Id'),
    );
    response.status(200).json(assignmentToDto(assignment));
  }

  /**
   * @param {import('express').Request} request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes the created assignment.
   */
  async assignRoute(request, response) {
    const { rangerId, routeId, assignedDate } = validateAssignmentBody(
      request.body,
    );
    const assignment = await this.assignmentService.assignPatrol(
      { userId: rangerId },
      { routeId },
      assignedDate,
    );
    response.status(201).json(assignmentToDto(assignment));
  }
}
