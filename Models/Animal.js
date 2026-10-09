import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const RISK_STATUS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const animalSchema = new mongoose.Schema(
  {
    animalId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    species: {
      type: String,
      required: true,
      trim: true,
    },

    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    riskStatus: {
      type: String,
      enum: RISK_STATUS,
      required: true,
      default: "LOW",
    },
  },
  {
    timestamps: true,
  }
);

// Instance method: updateRiskStatus
animalSchema.methods.updateRiskStatus = async function (status) {
  if (!RISK_STATUS.includes(status)) {
    throw new Error(`Invalid risk status: ${status}`);
  }
  this.riskStatus = status;
  return this.save();
};

export { RISK_STATUS };
const Animal = mongoose.model("Animal", animalSchema);
export default Animal;
