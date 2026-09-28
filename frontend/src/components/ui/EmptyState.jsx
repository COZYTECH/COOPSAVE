export const EmptyState = ({ title, description, action, icon: Icon }) => {
  return (
    <div className="rounded-xl border border-dashed border-ink/15 bg-white px-4 py-10 text-center">
      {Icon && (
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className={['text-sm font-semibold text-pamoja-ink', Icon ? 'mt-4' : ''].join(' ')}>{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-pamoja-muted">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};
