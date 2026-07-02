export const EmptyState = ({ title, description, action }) => {
  return (
    <div className="rounded-lg border border-dashed border-ink/15 bg-white px-4 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink/55">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};
