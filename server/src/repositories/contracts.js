/**
 * @typedef {object} AssignmentRepository
 * @property {(assignment: import('../domain/PatrolAssignment.js').PatrolAssignment) => Promise<import('../domain/PatrolAssignment.js').PatrolAssignment>} save
 * @property {(rangerId: string) => Promise<import('../domain/PatrolAssignment.js').PatrolAssignment|null>} findLatestByRangerId
 * @property {(assignmentId: string) => Promise<import('../domain/PatrolAssignment.js').PatrolAssignment|null>} findById
 * @property {(assignmentId: string, status: string) => Promise<void>} updateStatus
 */

/**
 * @typedef {object} RouteRepository
 * @property {(routeId: string) => Promise<import('../domain/PatrolRoute.js').PatrolRoute|null>} findById
 * @property {() => Promise<import('../domain/PatrolRoute.js').PatrolRoute[]>} findAll
 * @property {(route: import('../domain/PatrolRoute.js').PatrolRoute) => Promise<import('../domain/PatrolRoute.js').PatrolRoute>} save
 */

/**
 * @typedef {object} PatrolRepository
 * @property {(patrol: import('../domain/Patrol.js').Patrol) => Promise<import('../domain/Patrol.js').Patrol>} upsertByPatrolId
 * @property {(patrolId: string) => Promise<import('../domain/Patrol.js').Patrol|null>} findById
 * @property {() => Promise<import('../domain/Patrol.js').Patrol[]>} findAll
 */

/**
 * @typedef {object} UserRepository
 * @property {(userId: string) => Promise<import('../domain/User.js').User|null>} findById
 * @property {(user: import('../domain/User.js').User) => Promise<import('../domain/User.js').User>} save
 */
