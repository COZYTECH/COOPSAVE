export const Tabs = ({ items, activeKey, onChange }) => (
  <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-pamoja-forest/8 bg-pamoja-sage/60 p-1" role="tablist" aria-label="View options">
    {items.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={activeKey === key}
        onClick={() => onChange(key)}
        className={[
          'pamoja-focus min-h-10 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition',
          activeKey === key ? 'bg-white text-pamoja-forest shadow-sm' : 'text-pamoja-muted hover:text-pamoja-forest'
        ].join(' ')}
      >
        {label}
      </button>
    ))}
  </div>
);
