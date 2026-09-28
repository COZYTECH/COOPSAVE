const notificationRepository = require('../repositories/notificationRepository');
const obligationRepository = require('../repositories/obligationRepository');

const dateOnly = (date = new Date()) => date.toISOString().slice(0, 10);

const logScheduler = (event, metadata = {}) => {
  console.log(JSON.stringify({
    level: 'info',
    event,
    timestamp: new Date().toISOString(),
    ...metadata
  }));
};

const toNotification = (notification) => ({
  id: notification.id,
  cooperativeId: notification.cooperative_id,
  cycleId: notification.cycle_id,
  obligationId: notification.obligation_id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  actionPath: notification.action_path,
  readAt: notification.read_at,
  createdAt: notification.created_at
});

const processDueObligations = async (asOfDate = dateOnly()) => {
  const overdueCount = await obligationRepository.markOverdue(asOfDate);
  const notificationCount = await notificationRepository.createDueNotifications(asOfDate);
  logScheduler('obligation.scheduler.completed', { asOfDate, overdueCount, notificationCount });
  return { overdueCount, notificationCount };
};

const getForUser = async (userId, options) => (
  (await notificationRepository.findForUser(userId, options)).map(toNotification)
);

const markRead = async (id, userId) => {
  const notification = await notificationRepository.markRead(id, userId);
  return notification ? toNotification(notification) : null;
};

module.exports = {
  processDueObligations,
  getForUser,
  markRead,
  toNotification,
  dateOnly
};
