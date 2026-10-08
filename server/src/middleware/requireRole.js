import { ForbiddenError, UnauthorizedError } from '../domain/errors.js';

/**
 * Requires any seeded user identity.
 * @param {import('../repositories/contracts.js').UserRepository} userRepository User repository.
 * @returns {import('express').RequestHandler} Identity middleware.
 */
export function requireUser(userRepository) {
  return async (request, _response, next) => {
    try {
      const userId = request.get('X-User-Id');
      if (!userId) throw new UnauthorizedError();
      const user = await userRepository.findById(userId);
      if (!user)
        throw new UnauthorizedError(
          'X-User-Id does not identify a seeded user',
        );
      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Enforces a role using the seeded identity in X-User-Id.
 * @param {import('../repositories/contracts.js').UserRepository} userRepository User repository.
 * @param {string} role Required role.
 * @returns {import('express').RequestHandler} Authorization middleware.
 */
export function requireRole(userRepository, role) {
  const requireIdentity = requireUser(userRepository);
  return (request, response, next) => {
    requireIdentity(request, response, (error) => {
      if (error) return next(error);
      if (request.user.role !== role) return next(new ForbiddenError());
      next();
    });
  };
}
