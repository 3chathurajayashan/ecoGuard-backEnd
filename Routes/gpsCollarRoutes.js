import express from "express";
import {
  createGPSCollar,
  getGPSCollars,
  getGPSCollarById,
  updateGPSLocation,
  updateGPSCollar,
  deleteGPSCollar,
} from "../Controllers/gpsCollarController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createGPSCollar);
router.get("/", requireAuth, getGPSCollars);
router.get("/:id", requireAuth, getGPSCollarById);
router.patch("/:id/location", requireAuth, updateGPSLocation);
router.put("/:id", requireAuth, updateGPSCollar);
router.delete("/:id", requireAuth, deleteGPSCollar);

export default router;
