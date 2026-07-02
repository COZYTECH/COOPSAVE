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
    'mt-1 h-10 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-2 focus:ring-moss/15';

  return (
    <label className="block text-sm font-medium text-ink/75" htmlFor={id}>
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
          className={`${baseClass} h-24 resize-none py-2`}
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
