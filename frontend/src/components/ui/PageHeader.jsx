export const PageHeader = ({ eyebrow, title, description, actions }) => {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="pamoja-eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-pamoja-forest-deep">{title}</h1>
        {description && <p className="mt-1 text-sm text-pamoja-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
};
