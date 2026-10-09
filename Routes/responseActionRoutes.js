import express from "express";
import {
  createResponseAction,
  getResponseActions,
  getResponseActionById,
  updateResponseAction,
  updateResponseActionStatus,
  deleteResponseAction,
} from "../Controllers/responseActionController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { LIAISON, MANAGER, RANGER, RESPONDERS, STAFF } from "../middleware/roles.js";

const router = express.Router();

router.post("/", allowRoles(...RESPONDERS), createResponseAction);
router.get("/", allowRoles(...STAFF), getResponseActions);
router.get("/:id", allowRoles(...STAFF), getResponseActionById);
router.put("/:id", allowRoles(RANGER, LIAISON, MANAGER), updateResponseAction);
router.patch("/:id/status", allowRoles(RANGER, LIAISON, MANAGER), updateResponseActionStatus);
router.delete("/:id", allowRoles(MANAGER), deleteResponseAction);

export default router;
