import { CoverageCalculator } from '../domain/CoverageCalculator.js';
import { NotFoundError } from '../domain/errors.js';

/**
 * Coordinates route resolution and the swappable coverage strategy.
 */
export class CoverageService {
  /**
   * @param {object} dependencies Service dependencies.
   * @param {import('../repositories/contracts.js').PatrolRepository} dependencies.patrolRepository Patrol store.
   * @param {import('../repositories/contracts.js').AssignmentRepository} dependencies.assignmentRepository Assignment store.
   * @param {import('../repositories/contracts.js').RouteRepository} dependencies.routeRepository Route store.
   * @param {CoverageCalculator} [dependencies.coverageCalculator] Strategy implementation.
   */
  constructor({
    patrolRepository,
    assignmentRepository,
    routeRepository,
    coverageCalculator = new CoverageCalculator(),
  }) {
    this.patrolRepository = patrolRepository;
    this.assignmentRepository = assignmentRepository;
    this.routeRepository = routeRepository;
    this.coverageCalculator = coverageCalculator;
  }

  /**
   * Computes coverage for a saved patrol and its assignment route.
   * @param {import('../domain/Patrol.js').Patrol|string} patrolOrId Patrol instance or UUID.
   * @returns {Promise<object>} Coverage API report.
   */
  async reviewPatrolCoverage(patrolOrId) {
    const patrolId =
      typeof patrolOrId === 'string' ? patrolOrId : patrolOrId.patrolId;
    const patrol = await this.patrolRepository.findById(patrolId);
    if (!patrol) throw new NotFoundError('Patrol not found');
    const assignment = await this.assignmentRepository.findById(
      patrol.assignmentId,
    );
    if (!assignment) throw new NotFoundError('Assignment not found');
    const route = await this.routeRepository.findById(assignment.route.routeId);
    if (!route) throw new NotFoundError('Route not found');
    return {
      patrolId: patrol.patrolId,
      ...this.coverageCalculator.analyze(route, patrol.waypoints),
    };
  }
}
