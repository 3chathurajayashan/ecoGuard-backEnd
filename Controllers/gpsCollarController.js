import mongoose from "mongoose";
import GPSCollar, { COLLAR_STATUS } from "../Models/GPSCollar.js";
import Animal from "../Models/Animal.js";

// ───────────────────────────────────────────────
// POST /api/gps-collars
// ───────────────────────────────────────────────
export const createGPSCollar = async (req, res) => {
  try {
    const { animalId, status, lastLatitude, lastLongitude } = req.body;

    if (!animalId) {
      return res.status(400).json({
        success: false,
        message: "animalId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(animalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid animalId",
      });
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({
        success: false,
        message: "Animal not found",
      });
    }

    const existingCollar = await GPSCollar.findOne({ animalId });
    if (existingCollar) {
      return res.status(409).json({
        success: false,
        message: "A GPS collar is already assigned to this animal",
      });
    }

    if (status && !COLLAR_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${COLLAR_STATUS.join(", ")}`,
      });
    }

    const collarData = { animalId };
    if (status) collarData.status = status;
    if (lastLatitude != null) collarData.lastLatitude = lastLatitude;
    if (lastLongitude != null) collarData.lastLongitude = lastLongitude;
    if (lastLatitude != null || lastLongitude != null) {
      collarData.lastUpdated = new Date();
    }

    const collar = await GPSCollar.create(collarData);

    return res.status(201).json({
      success: true,
      message: "GPS collar created successfully",
      collar,
    });
  } catch (error) {
    console.error("CREATE GPS COLLAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create GPS collar",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/gps-collars
// ───────────────────────────────────────────────
export const getGPSCollars = async (req, res) => {
  try {
    const collars = await GPSCollar.find()
      .populate("animalId", "species identifier riskStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: collars.length,
      collars,
    });
  } catch (error) {
    console.error("GET GPS COLLARS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve GPS collars",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/gps-collars/:id
// ───────────────────────────────────────────────
export const getGPSCollarById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS collar ID",
      });
    }

    const collar = await GPSCollar.findById(id).populate(
      "animalId",
      "species identifier riskStatus"
    );

    if (!collar) {
      return res.status(404).json({
        success: false,
        message: "GPS collar not found",
      });
    }

    return res.status(200).json({
      success: true,
      collar,
    });
  } catch (error) {
    console.error("GET GPS COLLAR BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve GPS collar",
    });
  }
};

// ───────────────────────────────────────────────
// PATCH /api/gps-collars/:id/location
// ───────────────────────────────────────────────
export const updateGPSLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS collar ID",
      });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be between -180 and 180",
      });
    }

    const collar = await GPSCollar.findById(id);
    if (!collar) {
      return res.status(404).json({
        success: false,
        message: "GPS collar not found",
      });
    }

    await collar.recordLocation(latitude, longitude);

    return res.status(200).json({
      success: true,
      message: "GPS location updated successfully",
      collar,
    });
  } catch (error) {
    console.error("UPDATE GPS LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update GPS location",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/gps-collars/:id
// ───────────────────────────────────────────────
export const updateGPSCollar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS collar ID",
      });
    }

    const { status } = req.body;

    if (status && !COLLAR_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${COLLAR_STATUS.join(", ")}`,
      });
    }

    const collar = await GPSCollar.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!collar) {
      return res.status(404).json({
        success: false,
        message: "GPS collar not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "GPS collar updated successfully",
      collar,
    });
  } catch (error) {
    console.error("UPDATE GPS COLLAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update GPS collar",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/gps-collars/:id
// ───────────────────────────────────────────────
export const deleteGPSCollar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS collar ID",
      });
    }

    const collar = await GPSCollar.findByIdAndDelete(id);
    if (!collar) {
      return res.status(404).json({
        success: false,
        message: "GPS collar not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "GPS collar deleted successfully",
    });
  } catch (error) {
    console.error("DELETE GPS COLLAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete GPS collar",
    });
  }
};
