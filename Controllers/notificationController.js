import mongoose from "mongoose";
import Notification, { NOTIFICATION_STATUS } from "../Models/Notification.js";
import WildlifeConflictAlert from "../Models/WildlifeConflictAlert.js";
import User from "../Models/User.js";

// ───────────────────────────────────────────────
// POST /api/notifications
// ───────────────────────────────────────────────
export const createNotification = async (req, res) => {
  try {
    const { alertId, recipient, message } = req.body;

    if (!alertId || !recipient || !message) {
      return res.status(400).json({
        success: false,
        message: "alertId, recipient, and message are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alertId",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recipient)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient user ID",
      });
    }

    const alert = await WildlifeConflictAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    const user = await User.findById(recipient);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Recipient user not found",
      });
    }

    const notification = await Notification.create({
      alertId,
      recipient,
      message,
    });

    // Automatically mark as sent on creation
    await notification.send();

    return res.status(201).json({
      success: true,
      message: "Notification created and sent successfully",
      notification,
    });
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/notifications
// ───────────────────────────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const { alertId, recipient } = req.query;

    const filter = {};

    if (alertId) {
      if (!mongoose.Types.ObjectId.isValid(alertId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid alertId query parameter",
        });
      }
      filter.alertId = alertId;
    }

    if (recipient) {
      if (!mongoose.Types.ObjectId.isValid(recipient)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recipient query parameter",
        });
      }
      filter.recipient = recipient;
    }

    const notifications = await Notification.find(filter)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("recipient", "firstName lastName email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/notifications/:id
// ───────────────────────────────────────────────
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(id)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("recipient", "firstName lastName email role");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("GET NOTIFICATION BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notification",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ───────────────────────────────────────────────
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.status === "READ") {
      return res.status(400).json({
        success: false,
        message: "Notification is already marked as read",
      });
    }

    await notification.markAsRead();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("MARK NOTIFICATION AS READ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/notifications/:id
// ───────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};
