import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      required: [true, "Recipient role is required"],
      enum: ["PARK_MANAGER", "CONSERVATION_RESEARCHER", "COMMUNITY_LIAISON_OFFICER", "RANGER"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional: if targeting a specific user like the reporting Ranger
    },
    type: {
      type: String,
      required: true,
      enum: ["Incident Report", "Sync Complete", "Incident Update"],
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
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
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
