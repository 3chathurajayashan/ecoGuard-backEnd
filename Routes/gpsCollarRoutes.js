import express from "express";
import {
  createGPSCollar,
  getGPSCollars,
  getGPSCollarById,
  updateGPSLocation,
  updateGPSCollar,
  deleteGPSCollar,
} from "../Controllers/gpsCollarController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { LIAISON, MANAGER, RANGER, STAFF } from "../middleware/roles.js";

const router = express.Router();

router.post("/", allowRoles(MANAGER), createGPSCollar);
router.get("/", allowRoles(...STAFF), getGPSCollars);
router.get("/:id", allowRoles(...STAFF), getGPSCollarById);
// A collar position update (device feed, or the field simulator) can raise a conflict alert
router.patch("/:id/location", allowRoles(RANGER, LIAISON, MANAGER), updateGPSLocation);
router.put("/:id", allowRoles(MANAGER), updateGPSCollar);
router.delete("/:id", allowRoles(MANAGER), deleteGPSCollar);

export default router;
