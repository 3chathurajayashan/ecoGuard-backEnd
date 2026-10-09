import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const patrolRouteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parkName: { type: String, trim: true, default: "" },
    startPoint: { type: pointSchema, required: true },
    endPoint: { type: pointSchema, required: true },
    distanceKm: { type: Number, required: true, min: 0 },
    estimatedDurationMinutes: { type: Number, required: true, min: 0 },
    // The points a ranger is expected to pass; used to measure patrol coverage
    routePoints: { type: [pointSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

patrolRouteSchema.virtual("expectedWaypoints").get(function () {
  // undefined (not 0) when the route was loaded without its points
  return this.routePoints ? this.routePoints.length : undefined;
});
patrolRouteSchema.set("toJSON", { virtuals: true });
patrolRouteSchema.set("toObject", { virtuals: true });

const PatrolRoute = mongoose.models.PatrolRoute || mongoose.model("PatrolRoute", patrolRouteSchema);
export default PatrolRoute;
