import { Patrol } from '../domain/Patrol.js';
import { PatrolStatus, SyncStatus } from '../domain/enums.js';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import { Waypoint } from '../domain/Waypoint.js';
import { validateSyncPatrol } from '../validators/patrolValidators.js';

/**
 * Implements CentralSystem.receivePatrol and atomic idempotent synchronization.
 */
export class PatrolSyncService {
  /**
   * @param {object} dependencies Service dependencies.
   * @param {import('../repositories/contracts.js').PatrolRepository} dependencies.patrolRepository Patrol store.
   * @param {import('../repositories/contracts.js').AssignmentRepository} dependencies.assignmentRepository Assignment store.
   * @param {import('./AssignmentService.js').AssignmentService} dependencies.assignmentService Assignment lifecycle.
   */
  constructor({ patrolRepository, assignmentRepository, assignmentService }) {
    this.patrolRepository = patrolRepository;
    this.assignmentRepository = assignmentRepository;
    this.assignmentService = assignmentService;
  }

  /**
   * Receives, validates, stores and acknowledges a completed patrol.
   * @param {unknown} body Untrusted patrol DTO.
   * @param {string} rangerId Authenticated ranger identity.
   * @returns {Promise<{result:'SYNCED',patrolId:string}>} Sync result.
   */
  async receivePatrol(body, rangerId) {
    const dto = validateSyncPatrol(body);
    if (dto.status !== PatrolStatus.COMPLETED) {
      throw new ValidationError('Only COMPLETED patrols can be synchronized', [
        'status must be COMPLETED',
      ]);
    }
    const assignment = await this.assignmentRepository.findById(
      dto.assignmentId,
    );
    if (!assignment) throw new NotFoundError('Assignment not found');
    if (assignment.rangerId !== rangerId) {
      throw new ValidationError(
        'Patrol assignment does not belong to the authenticated ranger',
      );
    }

    const patrol = new Patrol({
      ...dto,
      syncStatus: SyncStatus.SYNCED,
      waypoints: dto.waypoints.map((waypoint) => new Waypoint(waypoint)),
    });
    patrol.markSynced();
    await this.patrolRepository.upsertByPatrolId(patrol);
    await this.assignmentService.completeAssignment(dto.assignmentId);
    return { result: 'SYNCED', patrolId: dto.patrolId };
  }
}
