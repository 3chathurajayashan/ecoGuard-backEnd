import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const CONFLICT_NOTIFICATION_STATUS = ["UNREAD", "READ", "SENT", "FAILED"];

const conflictNotificationSchema = new mongoose.Schema(
  {
    notificationId: {
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

    // Recipient — an existing User (RANGER, PARK_MANAGER, etc.)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: CONFLICT_NOTIFICATION_STATUS,
      default: "UNREAD",
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: send
conflictNotificationSchema.methods.send = async function () {
  // In a real system this would trigger push/email/SMS.
  // Here we mark it as SENT and record sentAt.
  this.status = "SENT";
  this.sentAt = new Date();
  return this.save();
};

// Instance method: markAsRead
conflictNotificationSchema.methods.markAsRead = async function () {
  this.status = "READ";
  return this.save();
};

export { CONFLICT_NOTIFICATION_STATUS };
const ConflictNotification = mongoose.model("ConflictNotification", conflictNotificationSchema);
export default ConflictNotification;
