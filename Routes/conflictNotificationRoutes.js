import express from "express";
import {
  createConflictNotification,
  getConflictNotifications,
  getConflictNotificationById,
  markConflictNotificationAsRead,
  deleteConflictNotification,
} from "../Controllers/conflictNotificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createConflictNotification);
router.get("/", requireAuth, getConflictNotifications);
router.get("/:id", requireAuth, getConflictNotificationById);
router.patch("/:id/read", requireAuth, markConflictNotificationAsRead);
router.delete("/:id", requireAuth, deleteConflictNotification);

export default router;
