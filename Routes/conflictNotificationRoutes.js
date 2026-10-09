import express from "express";
import {
  createConflictNotification,
  getConflictNotifications,
  getConflictNotificationById,
  markConflictNotificationAsRead,
  deleteConflictNotification,
} from "../Controllers/conflictNotificationController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { LIAISON, MANAGER, STAFF } from "../middleware/roles.js";

const router = express.Router();

router.post("/", allowRoles(LIAISON, MANAGER), createConflictNotification);
router.get("/", allowRoles(...STAFF), getConflictNotifications);
router.get("/:id", allowRoles(...STAFF), getConflictNotificationById);
router.patch("/:id/read", allowRoles(...STAFF), markConflictNotificationAsRead);
router.delete("/:id", allowRoles(MANAGER), deleteConflictNotification);

export default router;
