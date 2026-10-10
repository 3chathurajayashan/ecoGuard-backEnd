import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";
import auth from "../middleware/auth.js";

const router = express.Router();
//router.use(auth) is a middleware that ensures that all routes defined after it require authentication. It checks if the user is authenticated before allowing access to the notification routes. If the user is not authenticated, they will be denied access to these routes.
router.use(auth);

// Management routes
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);

export default router;
