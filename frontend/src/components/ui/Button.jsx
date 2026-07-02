import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-moss text-white hover:bg-moss/90',
  secondary: 'border border-ink/10 bg-white text-ink hover:bg-ink/5',
  danger: 'border border-clay/25 bg-clay/10 text-clay hover:bg-clay/15',
  ghost: 'text-ink/70 hover:bg-ink/5 hover:text-ink'
};

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={[
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60',
        variants[variant],
        className
      ].join(' ')}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
};
