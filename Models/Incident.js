import mongoose from "mongoose";
//mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides a straightforward, schema-based solution to model your application data. It includes built-in type casting, validation, query building, business logic hooks and more, out of the box.
const incidentSchema = new mongoose.Schema(
  {
    incidentType: {
      type: String,
      required: [true, "Incident type is required"],
      enum: [
        "Animal Carcase",
        "Poaching Incident",
        "Injured Animal",
        "Illegal Snare",
        "Illegal Campsite",
        "Other",
      ],
    },
    customIncidentType: {
      type: String,
      required: function () {
        return this.incidentType === "Other";
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (v) {
            return (
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 &&
              v[1] >= -90 &&
              v[1] <= 90
            );
          },
          message: "Coordinates must be a valid [longitude, latitude] array",
        },
      },
    },
    locationSource: {
      type: String,
      enum: ["Automatic GPS", "Manual"],
      default: "Automatic GPS",
    },
    evidence: [
      {
        url: { type: String, required: true },
        resourceType: { type: String, enum: ["image", "video"], required: true },
        publicId: { type: String }, // Used for deletion from Cloudinary
      },
    ],
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    syncStatus: {
      type: String,
      enum: ["Synchronized", "Pending Synchronization", "Failed"],
      default: "Synchronized",
    },
    clientId: {
      type: String,
      unique: true,
      sparse: true, // Allows nulls but enforces uniqueness when present (A1 flow)
    },
  },
  {
    timestamps: true, // Automatically handles reporting date and time
  }
);

// GeoSpatial Index for map querying
incidentSchema.index({ location: "2dsphere" });

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;
