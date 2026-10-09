import NotificationService from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationService.getNotificationsByRole(req.user.role, req.user.id);
    res.status(200).json({
      success: true,
      unread: notifications.filter((n) => !n.isRead).length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.user.role, req.user.id);
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
