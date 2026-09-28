const MINOR_UNITS = 2;

const toMinorUnits = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Amount must be a positive decimal with at most two fraction digits.');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(MINOR_UNITS, '0') || 0);
  if (minor <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }
  return minor;
};

const toDecimal = (minor) => {
  const value = BigInt(minor);
  const whole = value / 100n;
  const fraction = String(value % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
};

const toNonNegativeMinorUnits = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Amount must be a non-negative decimal with at most two fraction digits.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(MINOR_UNITS, '0') || 0);
};

module.exports = {
  toMinorUnits,
  toNonNegativeMinorUnits,
  toDecimal
};
