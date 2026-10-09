import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const RESPONSE_STATUS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const SYNC_STATUS = ["SYNCED", "PENDING_SYNC", "FAILED"];

const responseActionSchema = new mongoose.Schema(
  {
    responseId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WildlifeConflictAlert",
      required: true,
    },

    responseTime: {
      type: Date,
      default: Date.now,
    },

    actionTaken: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: RESPONSE_STATUS,
      default: "PENDING",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // What the ranger saw on site, and the evidence photos they attached
    situationAssessment: {
      type: String,
      trim: true,
      default: "",
    },

    photos: [{ type: String }],

    fieldLocation: {
      type: String,
      trim: true,
      default: "",
    },

    syncStatus: {
      type: String,
      enum: SYNC_STATUS,
      default: "PENDING_SYNC",
    },

    // Officer who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: updateStatus
responseActionSchema.methods.updateStatus = async function (status) {
  if (!RESPONSE_STATUS.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  this.status = status;
  return this.save();
};

export { RESPONSE_STATUS, SYNC_STATUS };
const ResponseAction = mongoose.model("ResponseAction", responseActionSchema);
export default ResponseAction;
