import Notification from "../Models/Notification.js";
import User from "../Models/User.js";

class NotificationService {
  async notifyManagement(incident) {
    try {
      // 1. Notify Management
      const managers = await User.find({ role: { $in: ["PARK_MANAGER", "CONSERVATION_RESEARCHER", "COMMUNITY_LIAISON_OFFICER"] } });
      
      const notifications = managers.map(manager => ({
        recipientRole: manager.role,
        recipient: manager._id,
        type: "Incident Report",
        title: `New ${incident.incidentType} Reported`,
        message: `A new incident has been reported at ${incident.location.coordinates}. Severity: ${incident.severity}.`,
        incidentId: incident._id
      }));

      // 2. Notify the Ranger who submitted it (Confirmation)
      notifications.push({
        recipientRole: "RANGER",
        recipient: incident.reportedBy,
        type: "Incident Report",
        title: "Report Submitted Successfully",
        message: `Your ${incident.incidentType} report has been successfully delivered to the Park Manager.`,
        incidentId: incident._id
      });

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error("Failed to send notifications:", error);
    }
  }

  async getNotificationsByRole(role, userId) {
    return await Notification.find({
      $or: [{ recipientRole: role }, { recipient: userId }]
    }).sort({ createdAt: -1 });
  }

  async markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new Error("Notification not found");
    notification.isRead = true;
    return await notification.save();
  }
}

export default new NotificationService();
