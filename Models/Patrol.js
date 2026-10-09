import mongoose from "mongoose";

const PATROL_STATUS = ["IN_PROGRESS", "COMPLETED"];
const SYNC_STATUS = ["PENDING_SYNC", "SYNCED"];
const WAYPOINT_TYPE = ["AUTOMATIC", "MANUAL"];
const OBSERVATION_TYPES = ["Observation", "Animal Sighting", "Sign / Tracks", "Illegal Activity", "Water Source", "Other"];

const waypointSchema = new mongoose.Schema(
  {
    // Generated on the device so the same waypoint is never stored twice
    waypointId: { type: String, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    altitude: { type: Number, default: 0 },
    timestamp: { type: Date, required: true },
    type: { type: String, enum: WAYPOINT_TYPE, required: true },
    // Manual waypoints record what the ranger saw (e.g. "Observation")
    category: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const patrolSchema = new mongoose.Schema(
  {
    // UUID created on the device when the patrol starts: makes sync idempotent
    patrolId: { type: String, required: true, unique: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "PatrolAssignment", required: true },
    ranger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "PatrolRoute", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    status: { type: String, enum: PATROL_STATUS, default: "IN_PROGRESS" },
    syncStatus: { type: String, enum: SYNC_STATUS, default: "PENDING_SYNC" },
    totalDistance: { type: Number, default: 0, min: 0 }, // kilometres
    waypoints: { type: [waypointSchema], default: [] },
    coveragePercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

patrolSchema.index({ startTime: -1 });

export { PATROL_STATUS, SYNC_STATUS, WAYPOINT_TYPE, OBSERVATION_TYPES };
const Patrol = mongoose.models.Patrol || mongoose.model("Patrol", patrolSchema);
export default Patrol;
