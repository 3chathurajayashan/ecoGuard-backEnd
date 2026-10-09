import mongoose from "mongoose";
import ResponseAction, { RESPONSE_STATUS, SYNC_STATUS } from "../Models/ResponseAction.js";
import WildlifeConflictAlert from "../Models/WildlifeConflictAlert.js";

// ───────────────────────────────────────────────
// POST /api/response-actions
// ───────────────────────────────────────────────
export const createResponseAction = async (req, res) => {
  try {
    const { alertId, actionTaken, notes, status, syncStatus, performedBy } = req.body;

    if (!alertId || !actionTaken) {
      return res.status(400).json({
        success: false,
        message: "alertId and actionTaken are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alertId",
      });
    }

    const alert = await WildlifeConflictAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    if (status && !RESPONSE_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${RESPONSE_STATUS.join(", ")}`,
      });
    }

    if (syncStatus && !SYNC_STATUS.includes(syncStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid syncStatus. Must be one of: ${SYNC_STATUS.join(", ")}`,
      });
    }

    if (performedBy && !mongoose.Types.ObjectId.isValid(performedBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid performedBy user ID",
      });
    }

    const responseAction = await ResponseAction.create({
      alertId,
      actionTaken,
      notes,
      status,
      syncStatus,
      performedBy: performedBy || null,
    });

    // Move alert to IN_PROGRESS if it was NEW or ACKNOWLEDGED
    if (["NEW", "ACKNOWLEDGED"].includes(alert.status)) {
      alert.status = "IN_PROGRESS";
      await alert.save();
    }

    return res.status(201).json({
      success: true,
      message: "Response action created successfully",
      responseAction,
    });
  } catch (error) {
    console.error("CREATE RESPONSE ACTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create response action",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/response-actions
// ───────────────────────────────────────────────
export const getResponseActions = async (req, res) => {
  try {
    const { alertId } = req.query;

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

    const responseActions = await ResponseAction.find(filter)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("performedBy", "firstName lastName email role")
      .sort({ responseTime: -1 });

    return res.status(200).json({
      success: true,
      count: responseActions.length,
      responseActions,
    });
  } catch (error) {
    console.error("GET RESPONSE ACTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve response actions",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/response-actions/:id
// ───────────────────────────────────────────────
export const getResponseActionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response action ID",
      });
    }

    const responseAction = await ResponseAction.findById(id)
      .populate("alertId", "alertId severity status latitude longitude")
      .populate("performedBy", "firstName lastName email role");

    if (!responseAction) {
      return res.status(404).json({
        success: false,
        message: "Response action not found",
      });
    }

    return res.status(200).json({
      success: true,
      responseAction,
    });
  } catch (error) {
    console.error("GET RESPONSE ACTION BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve response action",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/response-actions/:id
// ───────────────────────────────────────────────
export const updateResponseAction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response action ID",
      });
    }

    const { actionTaken, notes, syncStatus } = req.body;

    if (syncStatus && !SYNC_STATUS.includes(syncStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid syncStatus. Must be one of: ${SYNC_STATUS.join(", ")}`,
      });
    }

    const responseAction = await ResponseAction.findByIdAndUpdate(
      id,
      { actionTaken, notes, syncStatus },
      { new: true, runValidators: true }
    );

    if (!responseAction) {
      return res.status(404).json({
        success: false,
        message: "Response action not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Response action updated successfully",
      responseAction,
    });
  } catch (error) {
    console.error("UPDATE RESPONSE ACTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update response action",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/response-actions/:id/status
// ───────────────────────────────────────────────
export const updateResponseActionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response action ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    if (!RESPONSE_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${RESPONSE_STATUS.join(", ")}`,
      });
    }

    const responseAction = await ResponseAction.findById(id);
    if (!responseAction) {
      return res.status(404).json({
        success: false,
        message: "Response action not found",
      });
    }

    await responseAction.updateStatus(status);

    return res.status(200).json({
      success: true,
      message: "Response action status updated successfully",
      responseAction,
    });
  } catch (error) {
    console.error("UPDATE RESPONSE ACTION STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update response action status",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/response-actions/:id
// ───────────────────────────────────────────────
export const deleteResponseAction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response action ID",
      });
    }

    const responseAction = await ResponseAction.findByIdAndDelete(id);
    if (!responseAction) {
      return res.status(404).json({
        success: false,
        message: "Response action not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Response action deleted successfully",
    });
  } catch (error) {
    console.error("DELETE RESPONSE ACTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete response action",
    });
  }
};
