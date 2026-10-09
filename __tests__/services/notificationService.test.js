import { jest } from '@jest/globals';
import mongoose from "mongoose";
import NotificationService from "../../services/notificationService.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";

describe("NotificationService", () => {
  let parkManagerId;
  let rangerId;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(async () => {
    // 1. Create a mock Park Manager
    const manager = await User.create({
      firstName: "Manager",
      lastName: "Test",
      email: "manager@park.com",
      password: "password123",
      role: "PARK_MANAGER"
    });
    parkManagerId = manager._id;

    // 2. Create a mock Ranger
    const ranger = await User.create({
      firstName: "Ranger",
      lastName: "Test",
      email: "ranger@park.com",
      password: "password123",
      role: "RANGER"
    });
    rangerId = ranger._id;
  });

  it("should create notifications for managers and the reporting ranger", async () => {
    const mockIncident = {
      _id: new mongoose.Types.ObjectId(),
      incidentType: "Poaching Incident",
      severity: "High",
      location: { coordinates: [31.5, -25.0] },
      reportedBy: rangerId
    };

    await NotificationService.notifyManagement(mockIncident);

    // Verify notifications were created
    const notifications = await Notification.find();
    
    // 1 for Park Manager, 1 for Ranger
    expect(notifications.length).toBe(2);

    const managerNotif = notifications.find(n => n.recipientRole === "PARK_MANAGER");
    expect(managerNotif).toBeDefined();
    expect(managerNotif.title).toContain("Poaching Incident");

    const rangerNotif = notifications.find(n => n.recipientRole === "RANGER");
    expect(rangerNotif).toBeDefined();
    expect(rangerNotif.title).toBe("Report Submitted Successfully");
  });

  it("should fetch notifications by role or user id", async () => {
    await Notification.create({
      recipientRole: "PARK_MANAGER",
      recipient: parkManagerId,
      title: "Test Alert",
      message: "Test message",
      incidentId: new mongoose.Types.ObjectId()
    });

    const notifs = await NotificationService.getNotificationsByRole("PARK_MANAGER", parkManagerId);
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toBe("Test Alert");
  });

  it("should mark a notification as read", async () => {
    const notif = await Notification.create({
      recipientRole: "RANGER",
      recipient: rangerId,
      title: "Unread Alert",
      message: "Test",
      incidentId: new mongoose.Types.ObjectId()
    });

    expect(notif.isRead).toBe(false);

    const updatedNotif = await NotificationService.markAsRead(notif._id);
    
    expect(updatedNotif.isRead).toBe(true);
  });

  it("should throw error when marking a non-existent notification as read", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(NotificationService.markAsRead(fakeId)).rejects.toThrow("Notification not found");
  });
});
