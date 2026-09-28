const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getForUser(req.user.id, {
    limit: req.query.limit,
    unreadOnly: String(req.query.unread_only || '').toLowerCase() === 'true'
  });
  return apiResponse.success(res, 200, 'Notifications retrieved.', { notifications });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user.id);
  if (!notification) {
    return apiResponse.success(res, 200, 'Notification already read or unavailable.', { notification: null });
  }
  return apiResponse.success(res, 200, 'Notification marked as read.', { notification });
});

module.exports = { listNotifications, markNotificationRead };
