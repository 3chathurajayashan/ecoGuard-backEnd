import { AppError } from '../domain/errors.js';

/**
 * Central error mapper; never includes server stack traces in API responses.
 * @param {Error} error Thrown application or unexpected error.
 * @param {import('express').Request} _request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} _next Express next function.
 * @returns {void}
 */
export function errorHandler(error, _request, response, _next) {
  if (error instanceof AppError) {
    const body = { code: error.code, message: error.message };
    if (error.errors?.length) body.errors = error.errors;
    response.status(error.statusCode).json(body);
    return;
  }
  if (error?.type === 'entity.too.large') {
    response.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large',
    });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
}

/**
 * Converts rejected async route handlers into Express error flow.
 * @param {Function} handler Asynchronous Express handler.
 * @returns {import('express').RequestHandler} Express-compatible handler.
 */
export function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

/**
 * Handles paths not registered by the API.
 * @param {import('express').Request} _request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {void}
 */
export function notFoundHandler(_request, response) {
  response
    .status(404)
    .json({ code: 'NOT_FOUND', message: 'Endpoint not found' });
}
