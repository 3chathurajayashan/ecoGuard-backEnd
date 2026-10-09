import express from "express";
import {
  createAnimal,
  getAnimals,
  getAnimalById,
  updateAnimal,
  deleteAnimal,
  updateAnimalRiskStatus,
} from "../Controllers/animalController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { MANAGER, STAFF } from "../middleware/roles.js";

const router = express.Router();

router.post("/", allowRoles(MANAGER), createAnimal);
router.get("/", allowRoles(...STAFF), getAnimals);
router.get("/:id", allowRoles(...STAFF), getAnimalById);
router.put("/:id", allowRoles(MANAGER), updateAnimal);
router.delete("/:id", allowRoles(MANAGER), deleteAnimal);
router.patch("/:id/risk-status", allowRoles(MANAGER), updateAnimalRiskStatus);

export default router;
