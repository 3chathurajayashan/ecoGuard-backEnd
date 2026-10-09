import express from "express";
import {
  createResponseAction,
  uploadResponsePhotos,
  getResponseActions,
  getResponseActionById,
  updateResponseAction,
  updateResponseActionStatus,
  deleteResponseAction,
} from "../Controllers/responseActionController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import { LIAISON, MANAGER, RANGER, RESPONDERS, STAFF } from "../middleware/roles.js";

const router = express.Router();

// Defined before /:id so "photos" is not read as an id
router.post("/photos", allowRoles(...RESPONDERS), upload.array("photos", 5), uploadResponsePhotos);
router.post("/", allowRoles(...RESPONDERS), createResponseAction);
router.get("/", allowRoles(...STAFF), getResponseActions);
router.get("/:id", allowRoles(...STAFF), getResponseActionById);
router.put("/:id", allowRoles(RANGER, LIAISON, MANAGER), updateResponseAction);
router.patch("/:id/status", allowRoles(RANGER, LIAISON, MANAGER), updateResponseActionStatus);
router.delete("/:id", allowRoles(MANAGER), deleteResponseAction);

export default router;
