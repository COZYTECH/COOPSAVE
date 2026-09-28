export const FormField = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  as = 'input',
  children
}) => {
  const baseClass =
    'pamoja-focus mt-1 min-h-11 w-full rounded-lg border border-pamoja-forest/16 bg-white px-3 text-sm text-pamoja-ink outline-none transition placeholder:text-pamoja-muted focus:border-pamoja-forest focus:ring-2 focus:ring-pamoja-forest/10';

  return (
    <label className="block text-sm font-medium text-pamoja-body" htmlFor={id}>
      {label}
      {as === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          className={baseClass}
        >
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`${baseClass} min-h-24 resize-none py-2`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={baseClass}
        />
      )}
    </label>
  );
};
