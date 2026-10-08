import mongoose from 'mongoose';
import { dtoSchemaOptions, UUID_V4_PATTERN } from './schemaOptions.js';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'userId must be a UUID v4',
      },
    },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['RANGER', 'PARK_MANAGER'], required: true },
  },
  dtoSchemaOptions,
);

/** Mongoose storage model for seeded user identities. */
export const UserModel =
  mongoose.models.UserModel ?? mongoose.model('UserModel', userSchema);
