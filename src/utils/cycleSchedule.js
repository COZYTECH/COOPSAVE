const AppError = require('./appError');

const FREQUENCIES = Object.freeze(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM', 'ONE_TIME']);
const MAX_SCHEDULE_PERIODS = 1000;

const parseDateOnly = (value, fieldName = 'date') => {
  const normalized = value instanceof Date
    ? [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')
    : String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AppError(`${fieldName} must be a valid date.`, 422);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new AppError(`${fieldName} must be a valid date.`, 422);
  }
  return date;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date) => {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
};

const normalizeFrequency = (value = 'MONTHLY') => {
  const frequency = String(value).trim().toUpperCase();
  if (!FREQUENCIES.includes(frequency)) {
    throw new AppError(`Frequency must be one of: ${FREQUENCIES.join(', ')}.`, 422);
  }
  return frequency;
};

const normalizeIntervalDays = (value, frequency) => {
  if (frequency !== 'CUSTOM') return null;
  const intervalDays = Number(value);
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 3650) {
    throw new AppError('interval_days must be a whole number between 1 and 3650 for CUSTOM frequency.', 422);
  }
  return intervalDays;
};

const normalizeGracePeriodDays = (value = 0) => {
  const gracePeriodDays = Number(value);
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0 || gracePeriodDays > 365) {
    throw new AppError('grace_period_days must be a whole number between 0 and 365.', 422);
  }
  return gracePeriodDays;
};

const generateContributionPeriods = ({ startDate, endDate, frequency = 'MONTHLY', intervalDays = null }) => {
  const normalizedFrequency = normalizeFrequency(frequency);
  const start = parseDateOnly(startDate, 'start_date');
  const end = endDate ? parseDateOnly(endDate, 'end_date') : null;
  const normalizedInterval = normalizeIntervalDays(intervalDays, normalizedFrequency);

  if (end && end < start) {
    throw new AppError('end_date cannot be before start_date.', 422);
  }
  if (!end && normalizedFrequency !== 'ONE_TIME') {
    throw new AppError('end_date is required for recurring contribution frequencies.', 422);
  }

  const periods = [];
  let current = start;
  while (!end || current <= end) {
    periods.push(formatDateOnly(current));
    if (normalizedFrequency === 'ONE_TIME') break;
    if (periods.length >= MAX_SCHEDULE_PERIODS) {
      throw new AppError('The cycle schedule is too large. Shorten the date range or interval.', 422);
    }

    if (normalizedFrequency === 'DAILY') current = addDays(current, 1);
    else if (normalizedFrequency === 'WEEKLY') current = addDays(current, 7);
    else if (normalizedFrequency === 'BIWEEKLY') current = addDays(current, 14);
    else if (normalizedFrequency === 'CUSTOM') current = addDays(current, normalizedInterval);
    else current = addMonths(current);
  }

  return periods;
};

module.exports = {
  FREQUENCIES,
  MAX_SCHEDULE_PERIODS,
  parseDateOnly,
  formatDateOnly,
  normalizeFrequency,
  normalizeIntervalDays,
  normalizeGracePeriodDays,
  generateContributionPeriods
};
