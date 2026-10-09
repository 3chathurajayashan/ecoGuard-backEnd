import mongoose from "mongoose";
import Animal, { RISK_STATUS } from "../Models/Animal.js";

// ───────────────────────────────────────────────
// POST /api/animals
// ───────────────────────────────────────────────
export const createAnimal = async (req, res) => {
  try {
    const { species, identifier, riskStatus } = req.body;

    if (!species || !identifier) {
      return res.status(400).json({
        success: false,
        message: "species and identifier are required",
      });
    }

    if (riskStatus && !RISK_STATUS.includes(riskStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid riskStatus. Must be one of: ${RISK_STATUS.join(", ")}`,
      });
    }

    const existing = await Animal.findOne({ identifier });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An animal with this identifier already exists",
      });
    }

    const animal = await Animal.create({ species, identifier, riskStatus });

    return res.status(201).json({
      success: true,
      message: "Animal created successfully",
      animal,
    });
  } catch (error) {
    console.error("CREATE ANIMAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create animal",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/animals
// ───────────────────────────────────────────────
export const getAnimals = async (req, res) => {
  try {
    const animals = await Animal.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: animals.length,
      animals,
    });
  } catch (error) {
    console.error("GET ANIMALS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve animals",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/animals/:id
// ───────────────────────────────────────────────
export const getAnimalById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid animal ID",
      });
    }

    const animal = await Animal.findById(id);
    if (!animal) {
      return res.status(404).json({
        success: false,
        message: "Animal not found",
      });
    }

    return res.status(200).json({
      success: true,
      animal,
    });
  } catch (error) {
    console.error("GET ANIMAL BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve animal",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/animals/:id
// ───────────────────────────────────────────────
export const updateAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid animal ID",
      });
    }

    const { species, identifier, riskStatus } = req.body;

    if (riskStatus && !RISK_STATUS.includes(riskStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid riskStatus. Must be one of: ${RISK_STATUS.join(", ")}`,
      });
    }

    if (identifier) {
      const duplicate = await Animal.findOne({
        identifier,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "An animal with this identifier already exists",
        });
      }
    }

    const animal = await Animal.findByIdAndUpdate(
      id,
      { species, identifier, riskStatus },
      { new: true, runValidators: true }
    );

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: "Animal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Animal updated successfully",
      animal,
    });
  } catch (error) {
    console.error("UPDATE ANIMAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update animal",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/animals/:id
// ───────────────────────────────────────────────
export const deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid animal ID",
      });
    }

    const animal = await Animal.findByIdAndDelete(id);
    if (!animal) {
      return res.status(404).json({
        success: false,
        message: "Animal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Animal deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ANIMAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete animal",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/animals/:id/risk-status
// ───────────────────────────────────────────────
export const updateAnimalRiskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { riskStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid animal ID",
      });
    }

    if (!riskStatus) {
      return res.status(400).json({
        success: false,
        message: "riskStatus is required",
      });
    }

    if (!RISK_STATUS.includes(riskStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid riskStatus. Must be one of: ${RISK_STATUS.join(", ")}`,
      });
    }

    const animal = await Animal.findById(id);
    if (!animal) {
      return res.status(404).json({
        success: false,
        message: "Animal not found",
      });
    }

    await animal.updateRiskStatus(riskStatus);

    return res.status(200).json({
      success: true,
      message: "Risk status updated successfully",
      animal,
    });
  } catch (error) {
    console.error("UPDATE RISK STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update risk status",
    });
  }
};
