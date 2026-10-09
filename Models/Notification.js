import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      required: [true, "Recipient role is required"],
      enum: [
        "PARK_MANAGER",
        "CONSERVATION_RESEARCHER",
        "COMMUNITY_LIAISON_OFFICER",
        "RANGER",
        "VILLAGER",
      ],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional: if targeting a specific user like the reporting Ranger
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Incident Report",
        "Sync Complete",
        "Incident Update",
        "Conflict Alert",
        "Community Report",
        "Patrol",
      ],
      default: "Incident Report",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Exactly one of these links the notification to what it is about
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: false,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WildlifeConflictAlert",
      required: false,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityReport",
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
