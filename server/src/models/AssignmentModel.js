import mongoose from 'mongoose';
import { AssignmentStatus } from '../domain/enums.js';
import { dtoSchemaOptions, UUID_V4_PATTERN } from './schemaOptions.js';

const assignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'assignmentId must be a UUID v4',
      },
    },
    rangerId: {
      type: String,
      required: true,
      index: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'rangerId must be a UUID v4',
      },
    },
    routeId: {
      type: String,
      required: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'routeId must be a UUID v4',
      },
    },
    assignedDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      required: true,
    },
  },
  dtoSchemaOptions,
);

assignmentSchema.index({ rangerId: 1, assignedDate: -1 });

/** Mongoose storage model for ranger assignments. */
export const AssignmentModel =
  mongoose.models.AssignmentModel ??
  mongoose.model('AssignmentModel', assignmentSchema);
