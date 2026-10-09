import express from "express";
import {
  createCommunityReport,
  getCommunityReports,
  getCommunityReportById,
  updateCommunityReport,
  updateCommunityReportStatus,
  deleteCommunityReport,
} from "../Controllers/communityReportController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createCommunityReport);
router.get("/", requireAuth, getCommunityReports);
router.get("/:id", requireAuth, getCommunityReportById);
router.put("/:id", requireAuth, updateCommunityReport);
router.patch("/:id/status", requireAuth, updateCommunityReportStatus);
router.delete("/:id", requireAuth, deleteCommunityReport);

export default router;
