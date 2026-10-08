import { patrolToDto } from '../mappers/domainMappers.js';
import { validateUuidParam } from '../validators/patrolValidators.js';

/**
 * HTTP adapter for patrol synchronization, listing and coverage review.
 */
export class PatrolController {
  /**
   * @param {object} dependencies Controller dependencies.
   * @param {import('../services/PatrolSyncService.js').PatrolSyncService} dependencies.patrolSyncService Sync service.
   * @param {import('../services/CoverageService.js').CoverageService} dependencies.coverageService Coverage service.
   * @param {import('../repositories/contracts.js').PatrolRepository} dependencies.patrolRepository Patrol store.
   */
  constructor({ patrolSyncService, coverageService, patrolRepository }) {
    this.patrolSyncService = patrolSyncService;
    this.coverageService = coverageService;
    this.patrolRepository = patrolRepository;
  }

  /**
   * @param {import('express').Request} request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes sync result.
   */
  async syncPatrol(request, response) {
    response
      .status(200)
      .json(
        await this.patrolSyncService.receivePatrol(
          request.body,
          request.user.userId,
        ),
      );
  }

  /**
   * @param {import('express').Request} _request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes the synced patrol list.
   */
  async listPatrols(_request, response) {
    response
      .status(200)
      .json((await this.patrolRepository.findAll()).map(patrolToDto));
  }

  /**
   * @param {import('express').Request} request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes patrol coverage.
   */
  async getCoverage(request, response) {
    const patrolId = validateUuidParam(request.params.patrolId, 'patrolId');
    response
      .status(200)
      .json(await this.coverageService.reviewPatrolCoverage(patrolId));
  }
}
