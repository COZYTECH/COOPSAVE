const test = require('node:test');
const assert = require('node:assert/strict');
const { generateContributionPeriods } = require('../src/utils/cycleSchedule');

test('generates inclusive daily periods without timezone drift', () => {
  assert.deepEqual(generateContributionPeriods({ startDate: '2027-01-01', endDate: '2027-01-05', frequency: 'DAILY' }), [
    '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'
  ]);
});

test('generates weekly and biweekly periods inclusively', () => {
  assert.deepEqual(generateContributionPeriods({ startDate: '2027-01-01', endDate: '2027-01-22', frequency: 'WEEKLY' }), [
    '2027-01-01', '2027-01-08', '2027-01-15', '2027-01-22'
  ]);
  assert.deepEqual(generateContributionPeriods({ startDate: '2027-01-01', endDate: '2027-01-31', frequency: 'BIWEEKLY' }), [
    '2027-01-01', '2027-01-15', '2027-01-29'
  ]);
});

test('supports calendar-safe monthly and custom intervals', () => {
  assert.deepEqual(generateContributionPeriods({ startDate: '2027-01-31', endDate: '2027-04-30', frequency: 'MONTHLY' }), [
    '2027-01-31', '2027-02-28', '2027-03-28', '2027-04-28'
  ]);
  assert.deepEqual(generateContributionPeriods({ startDate: '2027-01-01', endDate: '2027-01-16', frequency: 'CUSTOM', intervalDays: 5 }), [
    '2027-01-01', '2027-01-06', '2027-01-11', '2027-01-16'
  ]);
});

test('requires an end date for recurring cycles', () => {
  assert.throws(
    () => generateContributionPeriods({ startDate: '2027-01-01', frequency: 'WEEKLY' }),
    /end_date is required/
  );
});
