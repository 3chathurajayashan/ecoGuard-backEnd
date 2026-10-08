import { AssignmentStatus } from '../../domain/enums.js';

/**
 * In-memory Repository implementations for deterministic unit tests.
 */
export class InMemoryRouteRepository {
  /**
   * @param {import('../../domain/PatrolRoute.js').PatrolRoute[]} [routes] Initial routes.
   */
  constructor(routes = []) {
    this.routes = new Map(routes.map((route) => [route.routeId, route]));
  }

  /** @param {string} routeId Route identifier. @returns {Promise<object|null>} Route. */
  async findById(routeId) {
    return this.routes.get(routeId) ?? null;
  }

  /** @returns {Promise<object[]>} All routes. */
  async findAll() {
    return [...this.routes.values()];
  }

  /** @param {object} route Domain route. @returns {Promise<object>} Saved route. */
  async save(route) {
    this.routes.set(route.routeId, route);
    return route;
  }
}

/**
 * In-memory assignment repository.
 */
export class InMemoryAssignmentRepository {
  /**
   * @param {import('../../domain/PatrolAssignment.js').PatrolAssignment[]} [assignments] Initial assignments.
   */
  constructor(assignments = []) {
    this.assignments = new Map(
      assignments.map((item) => [item.assignmentId, item]),
    );
  }

  /** @param {object} assignment Domain assignment. @returns {Promise<object>} Saved assignment. */
  async save(assignment) {
    this.assignments.set(assignment.assignmentId, assignment);
    return assignment;
  }

  /** @param {string} rangerId Ranger identifier. @returns {Promise<object|null>} Latest assignment. */
  async findLatestByRangerId(rangerId) {
    return (
      [...this.assignments.values()]
        .filter((assignment) => assignment.rangerId === rangerId)
        .sort((first, second) => second.assignedDate - first.assignedDate)[0] ??
      null
    );
  }

  /** @param {string} assignmentId Assignment identifier. @returns {Promise<object|null>} Assignment. */
  async findById(assignmentId) {
    return this.assignments.get(assignmentId) ?? null;
  }

  /** @param {string} assignmentId Assignment identifier. @param {string} status New status. @returns {Promise<void>} */
  async updateStatus(assignmentId, status) {
    const assignment = this.assignments.get(assignmentId);
    if (assignment) assignment.status = status;
  }

  /** @param {string} assignmentId Assignment identifier. @returns {Promise<void>} */
  async markCompleted(assignmentId) {
    await this.updateStatus(assignmentId, AssignmentStatus.COMPLETED);
  }
}

/**
 * In-memory patrol repository with upsert semantics.
 */
export class InMemoryPatrolRepository {
  /**
   * @param {import('../../domain/Patrol.js').Patrol[]} [patrols] Initial patrols.
   */
  constructor(patrols = []) {
    this.patrols = new Map(patrols.map((patrol) => [patrol.patrolId, patrol]));
  }

  /** @param {object} patrol Domain patrol. @returns {Promise<object>} Upserted patrol. */
  async upsertByPatrolId(patrol) {
    this.patrols.set(patrol.patrolId, patrol);
    return patrol;
  }

  /** @param {string} patrolId Patrol identifier. @returns {Promise<object|null>} Patrol. */
  async findById(patrolId) {
    return this.patrols.get(patrolId) ?? null;
  }

  /** @returns {Promise<object[]>} All stored patrols. */
  async findAll() {
    return [...this.patrols.values()];
  }
}

/**
 * In-memory user repository.
 */
export class InMemoryUserRepository {
  /**
   * @param {import('../../domain/User.js').User[]} [users] Initial users.
   */
  constructor(users = []) {
    this.users = new Map(users.map((user) => [user.userId, user]));
  }

  /** @param {string} userId User identifier. @returns {Promise<object|null>} User. */
  async findById(userId) {
    return this.users.get(userId) ?? null;
  }

  /** @param {object} user Domain user. @returns {Promise<object>} Saved user. */
  async save(user) {
    this.users.set(user.userId, user);
    return user;
  }
}
