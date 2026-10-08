import mongoose from "mongoose";
import RiskZone, { ZONE_TYPE } from "../Models/RiskZone.js";

// ───────────────────────────────────────────────
// POST /api/risk-zones
// ───────────────────────────────────────────────
export const createRiskZone = async (req, res) => {
  try {
    const { name, zoneType, description, boundary } = req.body;

    if (!name || !zoneType) {
      return res.status(400).json({
        success: false,
        message: "name and zoneType are required",
      });
    }

    if (!ZONE_TYPE.includes(zoneType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid zoneType. Must be one of: ${ZONE_TYPE.join(", ")}`,
      });
    }

    if (!boundary || boundary.type !== "Polygon" || !Array.isArray(boundary.coordinates)) {
      return res.status(400).json({
        success: false,
        message:
          "boundary must be a valid GeoJSON Polygon: { type: 'Polygon', coordinates: [[[lon, lat], ...]] }",
      });
    }

    const riskZone = await RiskZone.create({ name, zoneType, description, boundary });

    return res.status(201).json({
      success: true,
      message: "Risk zone created successfully",
      riskZone,
    });
  } catch (error) {
    console.error("CREATE RISK ZONE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create risk zone",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/risk-zones
// ───────────────────────────────────────────────
export const getRiskZones = async (req, res) => {
  try {
    const riskZones = await RiskZone.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: riskZones.length,
      riskZones,
    });
  } catch (error) {
    console.error("GET RISK ZONES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve risk zones",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/risk-zones/:id
// ───────────────────────────────────────────────
export const getRiskZoneById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid risk zone ID",
      });
    }

    const riskZone = await RiskZone.findById(id);
    if (!riskZone) {
      return res.status(404).json({
        success: false,
        message: "Risk zone not found",
      });
    }

    return res.status(200).json({
      success: true,
      riskZone,
    });
  } catch (error) {
    console.error("GET RISK ZONE BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve risk zone",
    });
  }
};

// ───────────────────────────────────────────────
// PUT /api/risk-zones/:id
// ───────────────────────────────────────────────
export const updateRiskZone = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid risk zone ID",
      });
    }

    const { name, zoneType, description, boundary } = req.body;

    if (zoneType && !ZONE_TYPE.includes(zoneType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid zoneType. Must be one of: ${ZONE_TYPE.join(", ")}`,
      });
    }

    if (boundary && (boundary.type !== "Polygon" || !Array.isArray(boundary.coordinates))) {
      return res.status(400).json({
        success: false,
        message:
          "boundary must be a valid GeoJSON Polygon: { type: 'Polygon', coordinates: [[[lon, lat], ...]] }",
      });
    }

    const riskZone = await RiskZone.findByIdAndUpdate(
      id,
      { name, zoneType, description, boundary },
      { new: true, runValidators: true }
    );

    if (!riskZone) {
      return res.status(404).json({
        success: false,
        message: "Risk zone not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Risk zone updated successfully",
      riskZone,
    });
  } catch (error) {
    console.error("UPDATE RISK ZONE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update risk zone",
    });
  }
};

// ───────────────────────────────────────────────
// DELETE /api/risk-zones/:id
// ───────────────────────────────────────────────
export const deleteRiskZone = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid risk zone ID",
      });
    }

    const riskZone = await RiskZone.findByIdAndDelete(id);
    if (!riskZone) {
      return res.status(404).json({
        success: false,
        message: "Risk zone not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Risk zone deleted successfully",
    });
  } catch (error) {
    console.error("DELETE RISK ZONE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete risk zone",
    });
  }
};

// ───────────────────────────────────────────────
// GET /api/risk-zones/check-location?lat=&lon=
// ───────────────────────────────────────────────
export const checkLocationInRiskZone = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat == null || lon == null) {
      return res.status(400).json({
        success: false,
        message: "lat and lon query parameters are required",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "lat must be a valid number between -90 and 90",
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "lon must be a valid number between -180 and 180",
      });
    }

    const matchingZones = await RiskZone.findContaining(latitude, longitude);

    return res.status(200).json({
      success: true,
      isInsideRiskZone: matchingZones.length > 0,
      matchingZones,
    });
  } catch (error) {
    console.error("CHECK LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check location",
    });
  }
};
