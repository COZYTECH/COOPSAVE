export const formatCurrency = (value, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: String(currency || 'NGN').toUpperCase(),
    maximumFractionDigits: 2
  }).format(Number(value || 0));
};

export const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

export const compactNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(Number(value || 0));
};
