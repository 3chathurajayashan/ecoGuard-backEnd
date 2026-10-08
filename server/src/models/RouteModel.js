import mongoose from 'mongoose';
import { dtoSchemaOptions, UUID_V4_PATTERN } from './schemaOptions.js';

const routePointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => UUID_V4_PATTERN.test(value),
        message: 'routeId must be a UUID v4',
      },
    },
    routeName: { type: String, required: true, trim: true },
    startPoint: { type: String, required: true, trim: true },
    endPoint: { type: String, required: true, trim: true },
    distance: { type: Number, required: true, min: 0 },
    estimatedDuration: { type: Number, required: true, min: 0 },
    expectedWaypoints: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'expectedWaypoints must be an integer',
      },
    },
    routePoints: { type: [routePointSchema], default: [] },
  },
  dtoSchemaOptions,
);

/** Mongoose storage model for route definitions. */
export const RouteModel =
  mongoose.models.RouteModel ?? mongoose.model('RouteModel', routeSchema);
