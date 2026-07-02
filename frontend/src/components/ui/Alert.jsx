export const Alert = ({ type = 'error', children }) => {
  const styles = {
    error: 'border-clay/25 bg-clay/10 text-clay',
    success: 'border-moss/20 bg-mint text-moss',
    info: 'border-ink/10 bg-paper text-ink/70'
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
};
