/**
 * Base application error with a stable HTTP-facing code.
 */
export class AppError extends Error {
  /**
   * Creates an application error.
   * @param {string} message Human-readable error.
   * @param {string} code Stable API error code.
   * @param {number} statusCode HTTP status.
   * @param {string[]} [errors] Validation details.
   */
  constructor(message, code, statusCode, errors) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/** Error for invalid domain or request data. */
export class ValidationError extends AppError {
  /**
   * @param {string} message Human-readable error.
   * @param {string[]} [errors] Validation details.
   */
  constructor(message, errors = []) {
    super(message, 'VALIDATION_ERROR', 400, errors);
  }
}

/** Error for a missing resource. */
export class NotFoundError extends AppError {
  /**
   * @param {string} message Human-readable error.
   * @param {string} [code] Stable API error code.
   */
  constructor(message, code = 'NOT_FOUND') {
    super(message, code, 404);
  }
}

/** Error for a caller not permitted to perform an operation. */
export class ForbiddenError extends AppError {
  /**
   * @param {string} message Human-readable error.
   */
  constructor(
    message = 'The caller is not permitted to perform this operation',
  ) {
    super(message, 'FORBIDDEN', 403);
  }
}

/** Error for a request missing an authenticated seeded identity. */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} message Human-readable error.
   */
  constructor(message = 'X-User-Id header is required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
