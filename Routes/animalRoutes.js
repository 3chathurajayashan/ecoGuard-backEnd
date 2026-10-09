import express from "express";
import {
  createAnimal,
  getAnimals,
  getAnimalById,
  updateAnimal,
  deleteAnimal,
  updateAnimalRiskStatus,
} from "../Controllers/animalController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createAnimal);
router.get("/", requireAuth, getAnimals);
router.get("/:id", requireAuth, getAnimalById);
router.put("/:id", requireAuth, updateAnimal);
router.delete("/:id", requireAuth, deleteAnimal);
router.patch("/:id/risk-status", requireAuth, updateAnimalRiskStatus);

export default router;
