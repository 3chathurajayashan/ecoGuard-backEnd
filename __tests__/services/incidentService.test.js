import { jest } from '@jest/globals';
import mongoose from "mongoose";
import IncidentService from "../../services/incidentService.js";
import NotificationService from "../../services/notificationService.js";
import Incident from "../../models/Incident.js";
import User from "../../models/User.js";

// Mock Cloudinary so we don't make real API calls
jest.mock("../../config/cloudinary.js", () => ({
  cloudinary: { uploader: { destroy: jest.fn() } },
  storage: {}
}));

describe("IncidentService", () => {
  let rangerId;

  beforeAll(() => {
    // Suppress expected console.error logs from dotenv and others during tests to keep output clean
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(async () => {
    const ranger = await User.create({
      firstName: "Test",
      lastName: "Ranger",
      email: "test@test.com",
      password: "password123",
      role: "RANGER"
    });
    rangerId = ranger._id;
  });

  const validData = {
    incidentType: "Poaching Incident",
    description: "Found some suspicious tracks.",
    longitude: 31.5,
    latitude: -25.0,
    severity: "High"
  };

  const validFiles = [{ path: "http://url.com/img.jpg", mimetype: "image/jpeg", filename: "img1" }];

  test("should create an incident successfully", async () => {
    // Spy on notifications
    jest.spyOn(NotificationService, "notifyManagement").mockImplementation();
    
    const incident = await IncidentService.createIncident(validData, validFiles, rangerId);
    
    expect(incident).toBeDefined();
    expect(incident.incidentType).toBe("Poaching Incident");
    expect(incident.evidence.length).toBe(1);
    expect(NotificationService.notifyManagement).toHaveBeenCalled();
  });

  test("should throw error if no evidence provided", async () => {
    await expect(IncidentService.createIncident(validData, [], rangerId))
      .rejects.toThrow("At least one piece of photographic or video evidence is required.");
  });

  test("should sync incidents correctly (offline A1 flow)", async () => {
    const offlineData = [{
      clientId: "client-123",
      incidentType: "Injured Animal",
      description: "Rhino hurt.",
      location: { type: "Point", coordinates: [31.5, -25.0] },
      evidence: [{ url: "http://test.com", resourceType: "image" }]
    }];

    const results = await IncidentService.syncIncidents(offlineData, rangerId);
    expect(results.successful.length).toBe(1);
    
    // Test duplicate block
    const duplicateResults = await IncidentService.syncIncidents(offlineData, rangerId);
    expect(duplicateResults.successful.length).toBe(1); // Fetches existing
  });

  test("should update incident (A5 flow)", async () => {
    const incident = await IncidentService.createIncident(validData, validFiles, rangerId);
    const updated = await IncidentService.updateIncident(incident._id, { description: "Updated description" }, rangerId);
    
    expect(updated.description).toBe("Updated description");
  });

  test("should prevent updating someone else's incident", async () => {
    const incident = await IncidentService.createIncident(validData, validFiles, rangerId);
    const fakeId = new mongoose.Types.ObjectId();
    
    await expect(IncidentService.updateIncident(incident._id, { description: "Hacked" }, fakeId))
      .rejects.toThrow("Not authorized to update this incident");
  });

  test("should manage evidence (A3 flow)", async () => {
    const incident = await IncidentService.createIncident(validData, validFiles, rangerId);
    
    // Add evidence
    const added = await IncidentService.addEvidence(incident._id, [{ path: "http://url2.com", mimetype: "video/mp4", filename: "vid1" }], rangerId);
    expect(added.evidence.length).toBe(2);
    
    // Delete evidence
    const deleted = await IncidentService.deleteEvidence(incident._id, added.evidence[0]._id, rangerId);
    expect(deleted.evidence.length).toBe(1);
  });

  test("should prevent deleting the last evidence", async () => {
    const incident = await IncidentService.createIncident(validData, validFiles, rangerId);
    await expect(IncidentService.deleteEvidence(incident._id, incident.evidence[0]._id, rangerId))
      .rejects.toThrow("Cannot delete the only piece of evidence");
  });
});
