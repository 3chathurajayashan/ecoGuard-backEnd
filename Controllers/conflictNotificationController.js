import mongoose from "mongoose";
import ConflictNotification, { CONFLICT_NOTIFICATION_STATUS } from "../Models/ConflictNotification.js";
import WildlifeConflictAlert from "../Models/WildlifeConflictAlert.js";
import User from "../Models/User.js";

// ───────────────────────────────────────────────
// POST /api/conflict-notifications
// ───────────────────────────────────────────────
export const createConflictNotification = async (req, res) => {
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

    const conflictNotification = await ConflictNotification.create({
      alertId,
      recipient,
      message,
    });

    // Automatically mark as sent on creation
    await conflictNotification.send();

    return res.status(201).json({
      success: true,
      message: "Conflict notification created and sent successfully",
      conflictNotification,
    });
  } catch (error) {
    console.error("CREATE CONFLICT NOTIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create conflict notification",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/conflict-notifications
// ───────────────────────────────────────────────
export const getConflictNotifications = async (req, res) => {
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

    const conflictNotifications = await ConflictNotification.find(filter)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("recipient", "firstName lastName email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: conflictNotifications.length,
      conflictNotifications,
    });
  } catch (error) {
    console.error("GET CONFLICT NOTIFICATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conflict notifications",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/conflict-notifications/:id
// ───────────────────────────────────────────────
export const getConflictNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conflict notification ID",
      });
    }

    const conflictNotification = await ConflictNotification.findById(id)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("recipient", "firstName lastName email role");

    if (!conflictNotification) {
      return res.status(404).json({
        success: false,
        message: "Conflict notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      conflictNotification,
    });
  } catch (error) {
    console.error("GET CONFLICT NOTIFICATION BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conflict notification",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/conflict-notifications/:id/read
// ───────────────────────────────────────────────
export const markConflictNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conflict notification ID",
      });
    }

    const conflictNotification = await ConflictNotification.findById(id);
    if (!conflictNotification) {
      return res.status(404).json({
        success: false,
        message: "Conflict notification not found",
      });
    }

    if (conflictNotification.status === "READ") {
      return res.status(400).json({
        success: false,
        message: "Conflict notification is already marked as read",
      });
    }

    await conflictNotification.markAsRead();

    return res.status(200).json({
      success: true,
      message: "Conflict notification marked as read",
      conflictNotification,
    });
  } catch (error) {
    console.error("MARK CONFLICT NOTIFICATION AS READ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark conflict notification as read",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/conflict-notifications/:id
// ───────────────────────────────────────────────
export const deleteConflictNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conflict notification ID",
      });
    }

    const conflictNotification = await ConflictNotification.findByIdAndDelete(id);
    if (!conflictNotification) {
      return res.status(404).json({
        success: false,
        message: "Conflict notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conflict notification deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CONFLICT NOTIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conflict notification",
    });
  }
};
