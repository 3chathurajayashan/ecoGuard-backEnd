import mongoose from "mongoose";
import WildlifeConflictAlert, {
  SEVERITY_LEVEL,
  ALERT_STATUS,
} from "../Models/WildlifeConflictAlert.js";
import User from "../Models/User.js";

// ───────────────────────────────────────────────
// POST /api/conflict-alerts
// ───────────────────────────────────────────────
export const createConflictAlert = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      severity,
      description,
      sourceReport,
      sourceAnimal,
      sourceRiskZone,
    } = req.body;

    if (latitude == null || longitude == null || !severity) {
      return res.status(400).json({
        success: false,
        message: "latitude, longitude, and severity are required",
      });
    }

    if (!SEVERITY_LEVEL.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${SEVERITY_LEVEL.join(", ")}`,
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be between -180 and 180",
      });
    }

    if (sourceReport && !mongoose.Types.ObjectId.isValid(sourceReport)) {
      return res.status(400).json({ success: false, message: "Invalid sourceReport ID" });
    }
    if (sourceAnimal && !mongoose.Types.ObjectId.isValid(sourceAnimal)) {
      return res.status(400).json({ success: false, message: "Invalid sourceAnimal ID" });
    }
    if (sourceRiskZone && !mongoose.Types.ObjectId.isValid(sourceRiskZone)) {
      return res.status(400).json({ success: false, message: "Invalid sourceRiskZone ID" });
    }

    const alert = await WildlifeConflictAlert.create({
      latitude,
      longitude,
      severity,
      description,
      sourceReport: sourceReport || null,
      sourceAnimal: sourceAnimal || null,
      sourceRiskZone: sourceRiskZone || null,
    });

    return res.status(201).json({
      success: true,
      message: "Wildlife conflict alert created successfully",
      alert,
    });
  } catch (error) {
    console.error("CREATE CONFLICT ALERT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create conflict alert",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/conflict-alerts
// ───────────────────────────────────────────────
export const getConflictAlerts = async (req, res) => {
  try {
    const alerts = await WildlifeConflictAlert.find()
      .populate("assignedOfficer", "firstName lastName email role")
      .populate("sourceReport", "reportType description status")
      .populate("sourceAnimal", "species identifier riskStatus")
      .populate("sourceRiskZone", "name zoneType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("GET CONFLICT ALERTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conflict alerts",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/conflict-alerts/:id
// ───────────────────────────────────────────────
export const getConflictAlertById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    const alert = await WildlifeConflictAlert.findById(id)
      .populate("assignedOfficer", "firstName lastName email role")
      .populate("sourceReport", "reportType description status")
      .populate("sourceAnimal", "species identifier riskStatus")
      .populate("sourceRiskZone", "name zoneType");

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error("GET CONFLICT ALERT BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conflict alert",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/conflict-alerts/:id
// ───────────────────────────────────────────────
export const updateConflictAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    const { latitude, longitude, severity, description } = req.body;

    if (severity && !SEVERITY_LEVEL.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${SEVERITY_LEVEL.join(", ")}`,
      });
    }

    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: "latitude must be between -90 and 90",
      });
    }

    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: "longitude must be between -180 and 180",
      });
    }

    const alert = await WildlifeConflictAlert.findByIdAndUpdate(
      id,
      { latitude, longitude, severity, description },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conflict alert updated successfully",
      alert,
    });
  } catch (error) {
    console.error("UPDATE CONFLICT ALERT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update conflict alert",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/conflict-alerts/:id/acknowledge
// ───────────────────────────────────────────────
export const acknowledgeConflictAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    const alert = await WildlifeConflictAlert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    if (alert.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Cannot acknowledge a closed alert",
      });
    }

    if (alert.status === "ACKNOWLEDGED") {
      return res.status(400).json({
        success: false,
        message: "Alert is already acknowledged",
      });
    }

    await alert.acknowledge();

    return res.status(200).json({
      success: true,
      message: "Alert acknowledged successfully",
      alert,
    });
  } catch (error) {
    console.error("ACKNOWLEDGE ALERT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge alert",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/conflict-alerts/:id/assign
// ───────────────────────────────────────────────
export const assignOfficerToAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { officerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    if (!officerId) {
      return res.status(400).json({
        success: false,
        message: "officerId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(officerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid officerId",
      });
    }

    // Verify the officer exists and has a valid role
    const officer = await User.findById(officerId);
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found",
      });
    }

    if (!["RANGER", "COMMUNITY_LIAISON_OFFICER"].includes(officer.role)) {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be a RANGER or COMMUNITY_LIAISON_OFFICER",
      });
    }

    const alert = await WildlifeConflictAlert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    if (alert.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign officer to a closed alert",
      });
    }

    await alert.assignOfficer(officerId);

    return res.status(200).json({
      success: true,
      message: "Officer assigned to alert successfully",
      alert,
    });
  } catch (error) {
    console.error("ASSIGN OFFICER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign officer",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/conflict-alerts/:id/close
// ───────────────────────────────────────────────
export const closeConflictAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    const alert = await WildlifeConflictAlert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    if (alert.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Alert is already closed",
      });
    }

    await alert.close();

    return res.status(200).json({
      success: true,
      message: "Alert closed successfully",
      alert,
    });
  } catch (error) {
    console.error("CLOSE ALERT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close alert",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/conflict-alerts/:id
// ───────────────────────────────────────────────
export const deleteConflictAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID",
      });
    }

    const alert = await WildlifeConflictAlert.findByIdAndDelete(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conflict alert deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CONFLICT ALERT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conflict alert",
    });
  }
};
