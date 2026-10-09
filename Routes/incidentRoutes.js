import express from "express";
import {
  createIncident,
  syncIncidents,
  updateIncident,
  addEvidence,
  deleteEvidence,
  getMyReports,
  getIncidentTypes,
  getAllIncidentsMapData
} from "../Controllers/incidentController.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Public routes
router.get("/types", getIncidentTypes);

// Protected routes (Ranger access)
router.use(auth);
router.get("/map", getAllIncidentsMapData); // Endpoint for the map view
router.post("/", upload.array("evidence", 5), createIncident);
router.post("/sync", syncIncidents); // Offline sync endpoint
router.get("/my-reports", getMyReports);
router.put("/:id", updateIncident);
router.post("/:id/evidence", upload.array("evidence", 5), addEvidence);
router.delete("/:id/evidence/:evidenceId", deleteEvidence);

export default router;
