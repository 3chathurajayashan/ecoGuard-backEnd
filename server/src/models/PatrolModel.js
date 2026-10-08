import mongoose from 'mongoose';
import { PatrolStatus, SyncStatus, WaypointType } from '../domain/enums.js';
import { dtoSchemaOptions, UUID_V4_PATTERN } from './schemaOptions.js';

const waypointSchema = new mongoose.Schema(
  {
    waypointId: {
      type: String,
      required: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'waypointId must be a UUID v4',
      },
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    altitude: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    type: { type: String, enum: Object.values(WaypointType), required: true },
    description: {
      type: String,
      default: '',
      validate: {
        validator(value) {
          return this.type !== WaypointType.MANUAL || value.trim().length > 0;
        },
        message: 'description is required for a MANUAL waypoint',
      },
    },
  },
  { _id: false },
);

const patrolSchema = new mongoose.Schema(
  {
    patrolId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'patrolId must be a UUID v4',
      },
    },
    assignmentId: {
      type: String,
      required: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'assignmentId must be a UUID v4',
      },
    },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startTime || value >= this.startTime;
        },
        message: 'endTime must be on or after startTime',
      },
    },
    status: { type: String, enum: Object.values(PatrolStatus), required: true },
    syncStatus: {
      type: String,
      enum: Object.values(SyncStatus),
      required: true,
    },
    totalDistance: { type: Number, required: true, min: 0 },
    waypoints: { type: [waypointSchema], default: [] },
  },
  dtoSchemaOptions,
);

/** Mongoose storage model for synchronized patrols. */
export const PatrolModel =
  mongoose.models.PatrolModel ?? mongoose.model('PatrolModel', patrolSchema);
