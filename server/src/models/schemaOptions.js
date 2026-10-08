/**
 * Shared transform preventing MongoDB implementation fields from leaking.
 * @param {object} _document Mongoose document.
 * @param {object} result Serialized object.
 * @returns {object} Clean JSON document.
 */
export function stripMongoFields(_document, result) {
  delete result._id;
  delete result.__v;
  return result;
}

/** Shared UUID v4 validator. */
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Shared schema options for DTO-safe serialization. */
export const dtoSchemaOptions = {
  timestamps: false,
  toJSON: { transform: stripMongoFields },
  toObject: { transform: stripMongoFields },
};
