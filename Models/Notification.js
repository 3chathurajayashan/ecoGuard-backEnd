import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      required: [true, "Recipient role is required"],
      enum: ["Park Manager", "Conservation Researcher", "Community Liaison Officer"],
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
