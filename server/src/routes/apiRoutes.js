import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole, requireUser } from '../middleware/requireRole.js';
import { AssignmentController } from '../controllers/AssignmentController.js';
import { PatrolController } from '../controllers/PatrolController.js';
import { RouteController } from '../controllers/RouteController.js';

/**
 * Builds the contract API routes from injected application dependencies.
 * @param {object} dependencies Application dependencies.
 * @returns {import('express').Router} Configured API router.
 */
export function createApiRouter(dependencies) {
  const router = Router();
  const assignmentController = new AssignmentController(
    dependencies.assignmentService,
  );
  const routeController = new RouteController(dependencies.routeRepository);
  const patrolController = new PatrolController(dependencies);
  const rangerOnly = requireRole(dependencies.userRepository, 'RANGER');
  const managerOnly = requireRole(dependencies.userRepository, 'PARK_MANAGER');
  const authenticated = requireUser(dependencies.userRepository);
  const syncLimiter =
    dependencies.syncRateLimit ??
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        code: 'RATE_LIMITED',
        message: 'Too many patrol sync requests',
      },
    });

  router.get('/health', (_request, response) =>
    response.status(200).json({ status: 'ok' }),
  );
  router.get(
    '/rangers/:rangerId/assignment',
    rangerOnly,
    asyncHandler((request, response) =>
      assignmentController.getRangerAssignment(request, response),
    ),
  );
  router.post(
    '/assignments',
    managerOnly,
    asyncHandler((request, response) =>
      assignmentController.assignRoute(request, response),
    ),
  );
  router.get(
    '/routes',
    authenticated,
    asyncHandler((request, response) =>
      routeController.listRoutes(request, response),
    ),
  );
  router.post(
    '/patrols/sync',
    rangerOnly,
    syncLimiter,
    asyncHandler((request, response) =>
      patrolController.syncPatrol(request, response),
    ),
  );
  router.get(
    '/patrols',
    managerOnly,
    asyncHandler((request, response) =>
      patrolController.listPatrols(request, response),
    ),
  );
  router.get(
    '/patrols/:patrolId/coverage',
    managerOnly,
    asyncHandler((request, response) =>
      patrolController.getCoverage(request, response),
    ),
  );
  return router;
}
