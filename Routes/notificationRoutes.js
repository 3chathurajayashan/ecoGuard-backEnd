import express from "express";
import { getNotifications, markAllAsRead, markAsRead } from "../Controllers/notificationController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

// Management routes
router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
