import express from "express";
import {
  createConflictAlert,
  getConflictAlerts,
  getConflictAlertById,
  updateConflictAlert,
  acknowledgeConflictAlert,
  assignOfficerToAlert,
  closeConflictAlert,
  deleteConflictAlert,
} from "../Controllers/wildlifeConflictAlertController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createConflictAlert);
router.get("/", requireAuth, getConflictAlerts);
router.get("/:id", requireAuth, getConflictAlertById);
router.put("/:id", requireAuth, updateConflictAlert);
router.patch("/:id/acknowledge", requireAuth, acknowledgeConflictAlert);
router.patch("/:id/assign", requireAuth, assignOfficerToAlert);
router.patch("/:id/close", requireAuth, closeConflictAlert);
router.delete("/:id", requireAuth, deleteConflictAlert);

export default router;
