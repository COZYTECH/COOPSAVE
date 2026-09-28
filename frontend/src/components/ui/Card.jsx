export const Card = ({ children, className = '' }) => {
  return (
    <section className={['rounded-xl border border-pamoja-forest/8 bg-white shadow-pamoja-soft', className].join(' ')}>
      {children}
    </section>
  );
};

export const StatCard = ({ label, value, detail, icon: Icon, accent = 'moss' }) => {
  const accentClasses = {
    moss: 'bg-pamoja-sage text-pamoja-forest',
    clay: 'bg-red-50 text-red-800',
    gold: 'bg-orange-100 text-pamoja-ochre',
    ink: 'bg-pamoja-forest text-white'
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-pamoja-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pamoja-ink">{value}</p>
          <p className="mt-1 text-sm text-pamoja-muted">{detail}</p>
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
