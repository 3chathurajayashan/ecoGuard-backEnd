import { AssignmentService } from './services/AssignmentService.js';
import { CoverageService } from './services/CoverageService.js';
import { PatrolSyncService } from './services/PatrolSyncService.js';
import { MongooseAssignmentRepository } from './repositories/mongoose/MongooseAssignmentRepository.js';
import { MongoosePatrolRepository } from './repositories/mongoose/MongoosePatrolRepository.js';
import { MongooseRouteRepository } from './repositories/mongoose/MongooseRouteRepository.js';
import { MongooseUserRepository } from './repositories/mongoose/MongooseUserRepository.js';

/**
 * Composes the runtime dependency graph once at the application boundary.
 * @returns {object} Fully wired application dependencies.
 */
export function createMongooseDependencies() {
  const assignmentRepository = new MongooseAssignmentRepository();
  const patrolRepository = new MongoosePatrolRepository();
  const routeRepository = new MongooseRouteRepository();
  const userRepository = new MongooseUserRepository();
  const assignmentService = new AssignmentService({
    assignmentRepository,
    routeRepository,
    userRepository,
  });
  const coverageService = new CoverageService({
    patrolRepository,
    assignmentRepository,
    routeRepository,
  });
  const patrolSyncService = new PatrolSyncService({
    patrolRepository,
    assignmentRepository,
    assignmentService,
  });
  return {
    assignmentRepository,
    patrolRepository,
    routeRepository,
    userRepository,
    assignmentService,
    coverageService,
    patrolSyncService,
  };
}
