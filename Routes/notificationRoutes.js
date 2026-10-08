import express from "express";
import {
  createNotification,
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  deleteNotification,
} from "../Controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createNotification);
router.get("/", requireAuth, getNotifications);
router.get("/:id", requireAuth, getNotificationById);
router.patch("/:id/read", requireAuth, markNotificationAsRead);
router.delete("/:id", requireAuth, deleteNotification);

export default router;
