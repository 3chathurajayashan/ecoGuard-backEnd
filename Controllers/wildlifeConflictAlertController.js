import mongoose from "mongoose";
import WildlifeConflictAlert, {
  SEVERITY_LEVEL,
  ALERT_STATUS,
  CLOSED_STATUSES,
  DETECTED_BY,
} from "../Models/WildlifeConflictAlert.js";
import ResponseAction from "../Models/ResponseAction.js";
import User from "../Models/User.js";
import { notifyClosed, raiseAlert, rerouteAlert } from "../services/conflictService.js";

const ALERT_POPULATE = [
  { path: "assignedOfficer", select: "firstName lastName email role" },
  { path: "acknowledgedBy", select: "firstName lastName role" },
  { path: "sourceReport", select: "reportType description status" },
  { path: "sourceAnimal", select: "species identifier riskStatus" },
  { path: "sourceRiskZone", select: "name zoneType description" },
];

const CLOSE_STATUSES = ["RESOLVED", "FALSE_ALERT", "CANCELLED"];

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
      detectedBy,
      locationName,
    } = req.body;

    if (detectedBy && !DETECTED_BY.includes(detectedBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid detectedBy. Must be one of: ${DETECTED_BY.join(", ")}`,
      });
    }

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

    const alert = await raiseAlert({
      latitude,
      longitude,
      severity,
      description,
      detectedBy: detectedBy || "MANUAL",
      locationName: locationName || "",
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
    // Optional filters: ?status=NEW&mine=true&active=true
    const filter = {};
    if (req.query.status) {
      const wanted = String(req.query.status).split(",").map((s) => s.trim().toUpperCase());
      filter.status = { $in: wanted };
    }
    if (req.query.active === "true") filter.status = { $nin: CLOSED_STATUSES };
    if (req.query.mine === "true") filter.assignedOfficer = req.user.id;

    const alerts = await WildlifeConflictAlert.find(filter)
      .populate(ALERT_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    // Attach each alert's most recent response so the screens need a single request
    const responses = await ResponseAction.find({ alertId: { $in: alerts.map((a) => a._id) } })
      .populate("performedBy", "firstName lastName role")
      .sort({ responseTime: -1 })
      .lean();
    const latest = new Map();
    for (const r of responses) if (!latest.has(String(r.alertId))) latest.set(String(r.alertId), r);
    const withResponse = alerts.map((a) => ({ ...a, latestResponse: latest.get(String(a._id)) ?? null }));

    return res.status(200).json({
      success: true,
      count: withResponse.length,
      alerts: withResponse,
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

    const alert = await WildlifeConflictAlert.findById(id).populate(ALERT_POPULATE).lean();

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Conflict alert not found",
      });
    }

    const responses = await ResponseAction.find({ alertId: alert._id })
      .populate("performedBy", "firstName lastName role")
      .sort({ responseTime: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      alert: { ...alert, latestResponse: responses[0] ?? null, responses },
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

    if (CLOSED_STATUSES.includes(alert.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot acknowledge a closed alert",
      });
    }

    if (alert.status !== "NEW") {
      return res.status(400).json({
        success: false,
        message: "Alert is already acknowledged",
      });
    }

    // Whoever acknowledges becomes the responder (a secondary officer may accept a re-routed alert)
    alert.assignedOfficer = req.user.id;
    await alert.acknowledge(req.user.id);

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

    if (CLOSED_STATUSES.includes(alert.status)) {
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

    if (CLOSED_STATUSES.includes(alert.status)) {
      return res.status(400).json({
        success: false,
        message: "Alert is already closed",
      });
    }

    // Closing form: final status, resolution time and remarks (all optional for older clients)
    const { finalStatus = "RESOLVED", resolvedAt, remarks = "" } = req.body || {};
    if (!CLOSE_STATUSES.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid finalStatus. Must be one of: ${CLOSE_STATUSES.join(", ")}`,
      });
    }
    let resolvedDate = null;
    if (resolvedAt) {
      resolvedDate = new Date(resolvedAt);
      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(400).json({ success: false, message: "resolvedAt must be a valid date" });
      }
    }

    await alert.close({ finalStatus, resolvedAt: resolvedDate, remarks, closedBy: req.user.id });
    await notifyClosed(alert, req.user.id);

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
// PATCH /api/conflict-alerts/:id/reroute
// The primary officer cannot be reached: pass the alert to the next ranger.
// ───────────────────────────────────────────────
export const rerouteConflictAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid alert ID" });
    }

    const alert = await WildlifeConflictAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Conflict alert not found" });
    }
    if (alert.status !== "NEW") {
      return res.status(400).json({
        success: false,
        message: "Only an alert nobody has acknowledged yet can be re-routed",
      });
    }

    const { next } = await rerouteAlert(alert, req.user);
    await alert.populate(ALERT_POPULATE);

    return res.status(200).json({
      success: true,
      message: next ? "Alert re-routed" : "No other officer is available",
      alert,
    });
  } catch (error) {
    console.error("REROUTE ALERT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to re-route alert" });
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
