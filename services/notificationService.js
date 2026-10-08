import Notification from "../models/Notification.js";
import User from "../models/User.js";

class NotificationService {
  async notifyManagement(incident) {
    try {
      const managers = await User.find({ role: { $in: ["Park Manager", "Conservation Researcher", "Community Liaison Officer"] } });
      
      const notifications = managers.map(manager => ({
        recipientRole: manager.role,
        recipient: manager._id,
        type: "Incident Report",
        title: `New ${incident.incidentType} Reported`,
        message: `A new incident has been reported at ${incident.location.coordinates}. Severity: ${incident.severity}.`,
        incidentId: incident._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error("Failed to send management notifications:", error);
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
