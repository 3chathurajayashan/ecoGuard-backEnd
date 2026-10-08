import IncidentService from "../services/incidentService.js";
import Incident from "../models/Incident.js";

export const createIncident = async (req, res, next) => {
  try {
    const incident = await IncidentService.createIncident(req.body, req.files, req.user.id);
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

export const syncIncidents = async (req, res, next) => {
  try {
    const results = await IncidentService.syncIncidents(req.body.incidents, req.user.id);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const updateIncident = async (req, res, next) => {
  try {
    const incident = await IncidentService.updateIncident(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

export const addEvidence = async (req, res, next) => {
  try {
    const incident = await IncidentService.addEvidence(req.params.id, req.files, req.user.id);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

export const deleteEvidence = async (req, res, next) => {
  try {
    const incident = await IncidentService.deleteEvidence(req.params.id, req.params.evidenceId, req.user.id);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    next(error);
  }
};

export const getIncidentTypes = (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      "Animal Carcase",
      "Poaching Incident",
      "Injured Animal",
      "Illegal Snare",
      "Illegal Campsite",
      "Other",
    ],
  });
};
