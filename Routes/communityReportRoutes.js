import express from "express";
import {
  createCommunityReport,
  getCommunityReports,
  getCommunityReportById,
  updateCommunityReport,
  updateCommunityReportStatus,
  deleteCommunityReport,
} from "../Controllers/communityReportController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { EVERYONE, LIAISON, MANAGER } from "../middleware/roles.js";

const router = express.Router();

// Anyone with an account can report a sighting; villagers only ever see their own reports.
router.post("/", allowRoles(...EVERYONE), createCommunityReport);
router.get("/", allowRoles(...EVERYONE), getCommunityReports);
router.get("/:id", allowRoles(...EVERYONE), getCommunityReportById);
router.put("/:id", allowRoles(LIAISON, MANAGER), updateCommunityReport);
// Verifying or dismissing a report is the liaison officer's job
router.patch("/:id/status", allowRoles(LIAISON, MANAGER), updateCommunityReportStatus);
router.delete("/:id", allowRoles(MANAGER), deleteCommunityReport);

export default router;
