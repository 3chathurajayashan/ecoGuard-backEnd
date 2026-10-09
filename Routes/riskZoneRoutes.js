import express from "express";
import {
  createRiskZone,
  getRiskZones,
  getRiskZoneById,
  updateRiskZone,
  deleteRiskZone,
  checkLocationInRiskZone,
} from "../Controllers/riskZoneController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// IMPORTANT: /check-location must be defined BEFORE /:id to avoid route conflict
router.get("/check-location", requireAuth, checkLocationInRiskZone);

router.post("/", requireAuth, createRiskZone);
router.get("/", requireAuth, getRiskZones);
router.get("/:id", requireAuth, getRiskZoneById);
router.put("/:id", requireAuth, updateRiskZone);
router.delete("/:id", requireAuth, deleteRiskZone);

export default router;
