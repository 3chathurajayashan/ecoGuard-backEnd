import mongoose from "mongoose";

const ASSIGNMENT_STATUS = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];

const patrolAssignmentSchema = new mongoose.Schema(
  {
    ranger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "PatrolRoute", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ASSIGNMENT_STATUS, default: "ASSIGNED" },
  },
  { timestamps: true }
);

patrolAssignmentSchema.index({ ranger: 1, assignedDate: -1 });

export { ASSIGNMENT_STATUS };
const PatrolAssignment =
  mongoose.models.PatrolAssignment || mongoose.model("PatrolAssignment", patrolAssignmentSchema);
export default PatrolAssignment;
