import { randomUUID } from 'node:crypto';
import { AssignmentStatus } from '../domain/enums.js';
import { PatrolAssignment } from '../domain/PatrolAssignment.js';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../domain/errors.js';

/**
 * Coordinates route assignments and ranger assignment retrieval.
 */
export class AssignmentService {
  /**
   * @param {object} dependencies Repositories used by the service.
   * @param {import('../repositories/contracts.js').AssignmentRepository} dependencies.assignmentRepository Assignment store.
   * @param {import('../repositories/contracts.js').RouteRepository} dependencies.routeRepository Route store.
   * @param {import('../repositories/contracts.js').UserRepository} dependencies.userRepository User store.
   */
  constructor({ assignmentRepository, routeRepository, userRepository }) {
    this.assignmentRepository = assignmentRepository;
    this.routeRepository = routeRepository;
    this.userRepository = userRepository;
  }

  /**
   * Retrieves the latest assignment for the authenticated ranger.
   * @param {string} rangerId Requested ranger.
   * @param {string} actorId Authenticated X-User-Id.
   * @returns {Promise<PatrolAssignment>} Assignment and route.
   */
  async getAssignmentForRanger(rangerId, actorId) {
    if (!actorId) throw new UnauthorizedError();
    if (rangerId !== actorId)
      throw new ForbiddenError('A ranger may only view their own assignment');
    const ranger = await this.userRepository.findById(rangerId);
    if (!ranger || ranger.role !== 'RANGER') {
      throw new NotFoundError('Ranger not found');
    }
    const assignment =
      await this.assignmentRepository.findLatestByRangerId(rangerId);
    if (!assignment) {
      throw new NotFoundError(
        'Ranger has no assigned route',
        'NO_ASSIGNED_ROUTE',
      );
    }
    return assignment;
  }

  /**
   * Assigns an existing route to an existing ranger.
   * @param {import('../domain/Ranger.js').Ranger|{userId:string}} ranger Ranger receiving assignment.
   * @param {import('../domain/PatrolRoute.js').PatrolRoute|{routeId:string}} route Assigned route.
   * @param {string|Date} [assignedDate] Assignment date.
   * @returns {Promise<PatrolAssignment>} Persisted assignment.
   */
  async assignPatrol(ranger, route, assignedDate = new Date()) {
    const rangerId = ranger?.userId;
    const routeId = route?.routeId;
    const savedRanger = rangerId
      ? await this.userRepository.findById(rangerId)
      : null;
    if (!savedRanger || savedRanger.role !== 'RANGER') {
      throw new NotFoundError('Ranger not found');
    }
    const savedRoute = routeId
      ? await this.routeRepository.findById(routeId)
      : null;
    if (!savedRoute) throw new NotFoundError('Route not found');
    const date = new Date(assignedDate);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError('assignedDate must be a valid date');
    }
    const assignment = new PatrolAssignment({
      assignmentId: randomUUID(),
      rangerId,
      assignedDate: date,
      status: AssignmentStatus.ASSIGNED,
      route: savedRoute,
    });
    return this.assignmentRepository.save(assignment);
  }

  /**
   * Marks an assignment completed after successful patrol synchronization.
   * @param {string} assignmentId Assignment identifier.
   * @returns {Promise<void>} Resolves after persistence.
   */
  async completeAssignment(assignmentId) {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment not found');
    await this.assignmentRepository.updateStatus(
      assignmentId,
      AssignmentStatus.COMPLETED,
    );
  }
}
