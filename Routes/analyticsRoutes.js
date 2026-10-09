import express from "express";

import {
  createReport,
  exportReport,
  getOverview,
  getReport,
  listReports,
  options,
  runAnalysis,
  updateReport,
} from "../Controllers/analyticsController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { MANAGER, RESEARCHER } from "../middleware/roles.js";

const router = express.Router();

// Analytics is for the people who plan conservation work, not for field staff or villagers.
const analysts = allowRoles(MANAGER, RESEARCHER);

router.get("/options", analysts, options);
router.get("/overview", analysts, getOverview);
router.post("/analyze", analysts, runAnalysis);

router.get("/reports", analysts, listReports);
router.post("/reports", analysts, createReport);
router.get("/reports/:id", analysts, getReport);
router.put("/reports/:id", analysts, updateReport);
router.get("/reports/:id/export", analysts, exportReport);

export default router;
