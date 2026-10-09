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
import auth, { authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { RANGER, STAFF } from "../middleware/roles.js";

const router = express.Router();

// Public routes
router.get("/types", getIncidentTypes);

// Protected routes
router.use(auth);
router.get("/map", authorize(...STAFF), getAllIncidentsMapData); // Endpoint for the map view

// Reporting is the ranger's job
router.post("/", authorize(RANGER), upload.array("evidence", 5), createIncident);
router.post("/sync", authorize(RANGER), syncIncidents); // Offline sync endpoint
router.get("/my-reports", authorize(RANGER), getMyReports);
router.put("/:id", authorize(RANGER), updateIncident);
router.post("/:id/evidence", authorize(RANGER), upload.array("evidence", 5), addEvidence);
router.delete("/:id/evidence/:evidenceId", authorize(RANGER), deleteEvidence);

export default router;
