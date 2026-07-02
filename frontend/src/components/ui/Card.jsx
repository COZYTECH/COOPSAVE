export const Card = ({ children, className = '' }) => {
  return (
    <section className={['rounded-lg border border-ink/10 bg-white shadow-panel', className].join(' ')}>
      {children}
    </section>
  );
};

export const StatCard = ({ label, value, detail, icon: Icon, accent = 'moss' }) => {
  const accentClasses = {
    moss: 'bg-mint text-moss',
    clay: 'bg-clay/10 text-clay',
    gold: 'bg-gold/20 text-ink',
    ink: 'bg-ink text-white'
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-ink/45">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-sm text-ink/55">{detail}</p>
        </div>
        {Icon && (
          <div className={`grid h-11 w-11 place-items-center rounded-lg ${accentClasses[accent]}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
};
