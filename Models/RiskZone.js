import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const ZONE_TYPE = [
  "BUFFER_ZONE",
  "HIGH_RISK_AREA",
  "COMMUNITY_SETTLEMENT",
  "WATER_SOURCE",
  "MIGRATION_CORRIDOR",
];

const riskZoneSchema = new mongoose.Schema(
  {
    zoneId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    zoneType: {
      type: String,
      enum: ZONE_TYPE,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // GeoJSON Polygon boundary for geo queries
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]], // array of rings, each ring is array of [lon, lat] pairs
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
riskZoneSchema.index({ boundary: "2dsphere" });

// Instance method: contains(lat, lon)
// Uses MongoDB $geoIntersects via a static helper (since instance cannot run queries on itself cleanly)
// The controller will call the static method instead.
riskZoneSchema.statics.findContaining = async function (lat, lon) {
  return this.find({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: "Point",
          coordinates: [lon, lat], // GeoJSON: [longitude, latitude]
        },
      },
    },
  });
};

export { ZONE_TYPE };
const RiskZone = mongoose.model("RiskZone", riskZoneSchema);
export default RiskZone;
