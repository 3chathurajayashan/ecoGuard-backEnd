import { z } from 'zod';
import { ValidationError } from '../domain/errors.js';

/** Zod schema for UUID version 4 identifiers. */
export const uuidV4Schema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'must be a UUID v4',
  );

/**
 * Converts all Zod issues into the standard application validation error.
 * @param {import('zod').SafeParseReturnType<any, any>} result Zod parse result.
 * @returns {any} Parsed data, if valid.
 */
export function unwrapValidation(result) {
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  throw new ValidationError('Request validation failed', errors);
}
