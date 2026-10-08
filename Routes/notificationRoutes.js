import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

// Management routes
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);

export default router;
