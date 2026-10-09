import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const SEVERITY_LEVEL = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
// CLOSED is kept for older records; new closures use RESOLVED, FALSE_ALERT or CANCELLED.
const ALERT_STATUS = ["NEW", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "FALSE_ALERT", "CANCELLED", "CLOSED"];
const CLOSED_STATUSES = ["RESOLVED", "FALSE_ALERT", "CANCELLED", "CLOSED"];
const DETECTED_BY = ["GPS_COLLAR", "COMMUNITY_REPORT", "MANUAL"];

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

    // How the alert was raised, and a readable place name for the screens
    detectedBy: {
      type: String,
      enum: DETECTED_BY,
      default: "MANUAL",
    },

    locationName: {
      type: String,
      trim: true,
      default: "",
    },

    // Officers who could not be reached; used to route the alert to someone else
    unreachableOfficers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

    // Filled in by the "Close alert" form
    closure: {
      finalStatus: { type: String, default: null },
      resolvedAt: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "" },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
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
wildlifeConflictAlertSchema.methods.acknowledge = async function (userId = null) {
  if (CLOSED_STATUSES.includes(this.status)) {
    throw new Error("Cannot acknowledge a closed alert");
  }
  this.status = "ACKNOWLEDGED";
  this.acknowledgedAt = new Date();
  if (userId) this.acknowledgedBy = userId;
  return this.save();
};

// Instance method: close
wildlifeConflictAlertSchema.methods.close = async function ({
  finalStatus = "RESOLVED",
  resolvedAt = null,
  remarks = "",
  closedBy = null,
} = {}) {
  this.status = finalStatus;
  this.closedAt = new Date();
  this.closure = {
    finalStatus,
    resolvedAt: resolvedAt || this.closedAt,
    remarks,
    closedBy,
  };
  return this.save();
};

export { SEVERITY_LEVEL, ALERT_STATUS, CLOSED_STATUSES, DETECTED_BY };
const WildlifeConflictAlert = mongoose.model(
  "WildlifeConflictAlert",
  wildlifeConflictAlertSchema
);
export default WildlifeConflictAlert;
