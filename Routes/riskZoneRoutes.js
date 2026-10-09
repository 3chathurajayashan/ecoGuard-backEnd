import express from "express";
import {
  createRiskZone,
  getRiskZones,
  getRiskZoneById,
  updateRiskZone,
  deleteRiskZone,
  checkLocationInRiskZone,
} from "../Controllers/riskZoneController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { EVERYONE, MANAGER, STAFF } from "../middleware/roles.js";

const router = express.Router();

// IMPORTANT: /check-location must be defined BEFORE /:id to avoid route conflict
router.get("/check-location", allowRoles(...EVERYONE), checkLocationInRiskZone);

router.post("/", allowRoles(MANAGER), createRiskZone);
router.get("/", allowRoles(...STAFF), getRiskZones);
router.get("/:id", allowRoles(...STAFF), getRiskZoneById);
router.put("/:id", allowRoles(MANAGER), updateRiskZone);
router.delete("/:id", allowRoles(MANAGER), deleteRiskZone);

export default router;
