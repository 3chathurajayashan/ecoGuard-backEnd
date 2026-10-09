import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const COMMUNITY_REPORT_TYPE = [
  "ANIMAL_SIGHTING",
  "CROP_DAMAGE",
  "LIVESTOCK_ATTACK",
  "HUMAN_INJURY",
  "OTHER",
];

const COMMUNITY_REPORT_STATUS = [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "RESOLVED",
  "DISMISSED",
];

const communityReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    reportType: {
      type: String,
      enum: COMMUNITY_REPORT_TYPE,
      required: true,
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

    description: {
      type: String,
      required: true,
      trim: true,
    },

    reportedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: COMMUNITY_REPORT_STATUS,
      default: "PENDING",
    },

    // Optional: link to the user who submitted the report
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    locationName: {
      type: String,
      trim: true,
      default: "",
    },

    // Set when a liaison officer reviews the report
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // The alert raised once the report was verified
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WildlifeConflictAlert",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: validateReport (basic business-level validation)
// Note: 'validate' is reserved by Mongoose internally, so we use 'validateReport'
communityReportSchema.methods.validateReport = function () {
  const errors = [];
  if (!this.reportType) errors.push("reportType is required");
  if (this.latitude == null) errors.push("latitude is required");
  if (this.longitude == null) errors.push("longitude is required");
  if (!this.description) errors.push("description is required");
  return errors;
};

// Instance method: updateStatus
communityReportSchema.methods.updateStatus = async function (status) {
  if (!COMMUNITY_REPORT_STATUS.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  this.status = status;
  return this.save();
};

export { COMMUNITY_REPORT_TYPE, COMMUNITY_REPORT_STATUS };
const CommunityReport = mongoose.model("CommunityReport", communityReportSchema);
export default CommunityReport;
