import Incident from "../Models/Incident.js";
import NotificationService from "./notificationService.js";
import { cloudinary } from "../config/cloudinary.js";

class IncidentService {
  async createIncident(data, files, userId) {
    if (!files || files.length === 0) {
      const error = new Error("At least one piece of photographic or video evidence is required.");
      error.statusCode = 400;
      throw error;
    }

    const evidence = files.map(file => ({
      url: file.path,
      resourceType: file.mimetype.startsWith("video") ? "video" : "image",
      publicId: file.filename
    }));

    const incidentData = {
      ...data,
      reportedBy: userId,
      evidence,
      location: {
        type: "Point",
        coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)]
      }
    };

    const incident = new Incident(incidentData);
    const savedIncident = await incident.save();
    
    // Asynchronous notification (Main Flow step 15)
    NotificationService.notifyManagement(savedIncident);
    
    return savedIncident;
  }

  async syncIncidents(incidentsData, userId) {
    const results = { successful: [], failed: [] };
    
    for (const data of incidentsData) {
      try {
        if (data.clientId) {
          const existing = await Incident.findOne({ clientId: data.clientId });
          if (existing) {
            results.successful.push(existing);
            continue;
          }
        }
        
        const incidentData = { ...data, reportedBy: userId, syncStatus: "Synchronized" };
        const incident = new Incident(incidentData);
        const savedIncident = await incident.save();
        NotificationService.notifyManagement(savedIncident);
        results.successful.push(savedIncident);
      } catch (error) {
        results.failed.push({ clientId: data.clientId, error: error.message });
      }
    }
    return results;
  }

  async updateIncident(id, updateData, userId) {
    const incident = await Incident.findById(id);
    if (!incident) {
      const error = new Error("Incident not found");
      error.statusCode = 404;
      throw error;
    }
    if (incident.reportedBy.toString() !== userId.toString()) {
      const error = new Error("Not authorized to update this incident");
      error.statusCode = 403;
      throw error;
    }
    
    if (updateData.longitude && updateData.latitude) {
      updateData.location = {
        type: "Point",
        coordinates: [parseFloat(updateData.longitude), parseFloat(updateData.latitude)]
      };
    }
    
    Object.assign(incident, updateData);
    return await incident.save();
  }

  async addEvidence(id, files, userId) {
    if (!files || files.length === 0) {
      const error = new Error("No evidence provided");
      error.statusCode = 400;
      throw error;
    }
    const incident = await Incident.findById(id);
    if (!incident) {
      const error = new Error("Incident not found");
      error.statusCode = 404;
      throw error;
    }
    if (incident.reportedBy.toString() !== userId.toString()) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    
    const newEvidence = files.map(file => ({
      url: file.path,
      resourceType: file.mimetype.startsWith("video") ? "video" : "image",
      publicId: file.filename
    }));
    
    incident.evidence.push(...newEvidence);
    return await incident.save();
  }

  async deleteEvidence(id, evidenceId, userId) {
    const incident = await Incident.findById(id);
    if (!incident) throw new Error("Incident not found");
    if (incident.reportedBy.toString() !== userId.toString()) throw new Error("Not authorized");
    if (incident.evidence.length <= 1) {
      throw new Error("Cannot delete the only piece of evidence");
    }
    
    const evidenceItem = incident.evidence.id(evidenceId);
    if (!evidenceItem) throw new Error("Evidence not found");
    
    if (evidenceItem.publicId) {
      await cloudinary.uploader.destroy(evidenceItem.publicId);
    }
    
    incident.evidence.pull(evidenceId);
    return await incident.save();
  }
}

export default new IncidentService();
