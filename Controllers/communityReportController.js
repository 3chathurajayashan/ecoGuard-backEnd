import mongoose from "mongoose";
import CommunityReport, {
  COMMUNITY_REPORT_TYPE,
  COMMUNITY_REPORT_STATUS,
} from "../Models/CommunityReport.js";
import { notifyUsers, reviewCommunityReport } from "../services/conflictService.js";
import User from "../Models/User.js";

// ───────────────────────────────────────────────
// POST /api/community-reports
// ───────────────────────────────────────────────
export const createCommunityReport = async (req, res) => {
  try {
    const { reportType, latitude, longitude, description, locationName } = req.body;
    // The signed-in user is always the reporter
    const reportedBy = req.user.id;

    if (!reportType || latitude == null || longitude == null || !description) {
      return res.status(400).json({
        success: false,
        message: "reportType, latitude, longitude, and description are required",
      });
    }

    if (!COMMUNITY_REPORT_TYPE.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reportType. Must be one of: ${COMMUNITY_REPORT_TYPE.join(", ")}`,
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

    if (reportedBy && !mongoose.Types.ObjectId.isValid(reportedBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reportedBy user ID",
      });
    }

    const report = await CommunityReport.create({
      reportType,
      latitude,
      longitude,
      description,
      locationName: locationName || "",
      reportedBy: reportedBy || null,
    });

    // Liaison officers must verify it before any alert goes out
    const liaisons = await User.find({ role: "COMMUNITY_LIAISON_OFFICER", isActive: true });
    await notifyUsers(liaisons, {
      title: "Report needs verification",
      message: `${req.user.firstName ?? "A villager"} reported ${reportType.toLowerCase().replace(/_/g, " ")}${locationName ? ` near ${locationName}` : ""}.`,
      reportId: report._id,
      type: "Community Report",
    });

    return res.status(201).json({
      success: true,
      message: "Community report submitted successfully",
      report,
    });
  } catch (error) {
    console.error("CREATE COMMUNITY REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit community report",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/community-reports
// ───────────────────────────────────────────────
export const getCommunityReports = async (req, res) => {
  try {
    // Villagers only see their own reports; staff see all (optionally ?status=PENDING,UNDER_REVIEW)
    const filter = {};
    if (req.user.role === "VILLAGER") filter.reportedBy = req.user.id;
    if (req.query.status) {
      filter.status = { $in: String(req.query.status).split(",").map((s) => s.trim().toUpperCase()) };
    }

    const reports = await CommunityReport.find(filter)
      .populate("reportedBy", "firstName lastName email role")
      .sort({ reportedAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("GET COMMUNITY REPORTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve community reports",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/community-reports/:id
// ───────────────────────────────────────────────
export const getCommunityReportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await CommunityReport.findById(id).populate(
      "reportedBy",
      "firstName lastName email role"
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Community report not found",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("GET COMMUNITY REPORT BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve community report",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/community-reports/:id
// ───────────────────────────────────────────────
export const updateCommunityReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const { reportType, latitude, longitude, description } = req.body;

    if (reportType && !COMMUNITY_REPORT_TYPE.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reportType. Must be one of: ${COMMUNITY_REPORT_TYPE.join(", ")}`,
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

    const report = await CommunityReport.findByIdAndUpdate(
      id,
      { reportType, latitude, longitude, description },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Community report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Community report updated successfully",
      report,
    });
  } catch (error) {
    console.error("UPDATE COMMUNITY REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update community report",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/community-reports/:id/status
// ───────────────────────────────────────────────
export const updateCommunityReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    if (!COMMUNITY_REPORT_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${COMMUNITY_REPORT_STATUS.join(", ")}`,
      });
    }

    const report = await CommunityReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Community report not found",
      });
    }

    // Verifying raises a conflict alert, dismissing archives the report; both tell the reporter
    const { alert } = await reviewCommunityReport(report, status, req.user);

    return res.status(200).json({
      success: true,
      message:
        status === "VERIFIED"
          ? "Report verified and a conflict alert was raised"
          : "Report status updated successfully",
      report,
      alert,
    });
  } catch (error) {
    console.error("UPDATE REPORT STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update report status",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/community-reports/:id
// ───────────────────────────────────────────────
export const deleteCommunityReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await CommunityReport.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Community report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Community report deleted successfully",
    });
  } catch (error) {
    console.error("DELETE COMMUNITY REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete community report",
    });
  }
};
