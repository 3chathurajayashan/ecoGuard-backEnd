import express from "express";
import {
  createResponseAction,
  getResponseActions,
  getResponseActionById,
  updateResponseAction,
  updateResponseActionStatus,
  deleteResponseAction,
} from "../Controllers/responseActionController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createResponseAction);
router.get("/", requireAuth, getResponseActions);
router.get("/:id", requireAuth, getResponseActionById);
router.put("/:id", requireAuth, updateResponseAction);
router.patch("/:id/status", requireAuth, updateResponseActionStatus);
router.delete("/:id", requireAuth, deleteResponseAction);

export default router;
