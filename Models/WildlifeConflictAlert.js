import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const SEVERITY_LEVEL = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ALERT_STATUS = ["NEW", "ACKNOWLEDGED", "IN_PROGRESS", "CLOSED"];

const wildlifeConflictAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    severity: {
      type: String,
      enum: SEVERITY_LEVEL,
      required: true,
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ALERT_STATUS,
      default: "NEW",
    },

    // Optional: alert description / additional context
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Reference to existing User with role RANGER (acts as FieldOfficer)
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Optional source references
    sourceReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityReport",
      default: null,
    },

    sourceAnimal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      default: null,
    },

    sourceRiskZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiskZone",
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: assignOfficer
wildlifeConflictAlertSchema.methods.assignOfficer = async function (officerId) {
  this.assignedOfficer = officerId;
  return this.save();
};

// Instance method: acknowledge
wildlifeConflictAlertSchema.methods.acknowledge = async function () {
  if (this.status === "CLOSED") {
    throw new Error("Cannot acknowledge a closed alert");
  }
  this.status = "ACKNOWLEDGED";
  this.acknowledgedAt = new Date();
  return this.save();
};

// Instance method: close
wildlifeConflictAlertSchema.methods.close = async function () {
  this.status = "CLOSED";
  this.closedAt = new Date();
  return this.save();
};

export { SEVERITY_LEVEL, ALERT_STATUS };
const WildlifeConflictAlert = mongoose.model(
  "WildlifeConflictAlert",
  wildlifeConflictAlertSchema
);
export default WildlifeConflictAlert;
