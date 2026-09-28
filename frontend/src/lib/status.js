export const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (['success', 'successful', 'completed', 'paid', 'matched'].includes(normalized)) {
    return 'success';
  }

  if (['pending', 'queued'].includes(normalized)) {
    return 'pending';
  }

  if (['processing'].includes(normalized)) {
    return 'processing';
  }

  if (['failed', 'failure', 'rejected'].includes(normalized)) {
    return 'danger';
  }

  return 'neutral';
};
