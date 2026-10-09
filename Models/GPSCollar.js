import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const COLLAR_STATUS = ["ACTIVE", "INACTIVE", "MAINTENANCE", "LOST"];

const gpsCollarSchema = new mongoose.Schema(
  {
    collarId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
      unique: true, // one collar per animal
    },

    status: {
      type: String,
      enum: COLLAR_STATUS,
      default: "ACTIVE",
    },

    lastLatitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },

    lastLongitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },

    lastUpdated: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: recordLocation
gpsCollarSchema.methods.recordLocation = async function (lat, lon) {
  this.lastLatitude = lat;
  this.lastLongitude = lon;
  this.lastUpdated = new Date();
  return this.save();
};

// Instance method: isActive
gpsCollarSchema.methods.isActive = function () {
  return this.status === "ACTIVE";
};

export { COLLAR_STATUS };
const GPSCollar = mongoose.model("GPSCollar", gpsCollarSchema);
export default GPSCollar;
