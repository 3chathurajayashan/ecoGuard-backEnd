import express from "express";
import {
  createConflictAlert,
  getConflictAlerts,
  getConflictAlertById,
  updateConflictAlert,
  acknowledgeConflictAlert,
  assignOfficerToAlert,
  rerouteConflictAlert,
  closeConflictAlert,
  deleteConflictAlert,
} from "../Controllers/wildlifeConflictAlertController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { LIAISON, MANAGER, RANGER, RESPONDERS, STAFF } from "../middleware/roles.js";

const router = express.Router();

router.post("/", allowRoles(RANGER, LIAISON, MANAGER), createConflictAlert);
router.get("/", allowRoles(...STAFF), getConflictAlerts);
router.get("/:id", allowRoles(...STAFF), getConflictAlertById);
router.put("/:id", allowRoles(LIAISON, MANAGER), updateConflictAlert);
router.patch("/:id/acknowledge", allowRoles(...RESPONDERS), acknowledgeConflictAlert);
router.patch("/:id/assign", allowRoles(LIAISON, MANAGER), assignOfficerToAlert);
router.patch("/:id/reroute", allowRoles(RANGER, LIAISON, MANAGER), rerouteConflictAlert);
router.patch("/:id/close", allowRoles(RANGER, LIAISON, MANAGER), closeConflictAlert);
router.delete("/:id", allowRoles(MANAGER), deleteConflictAlert);

export default router;
