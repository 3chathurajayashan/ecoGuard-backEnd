import NotificationService from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationService.getNotificationsByRole(req.user.role, req.user.id);
    res.status(200).json({ success: true, data: notifications });
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
