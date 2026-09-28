import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-pamoja-forest text-white hover:bg-pamoja-forest-deep',
  secondary: 'border border-pamoja-forest/12 bg-white text-pamoja-forest hover:bg-pamoja-sage',
  danger: 'border border-red-700/20 bg-red-50 text-red-800 hover:bg-red-100',
  ghost: 'text-pamoja-body hover:bg-pamoja-sage hover:text-pamoja-forest'
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
        'pamoja-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60 sm:min-h-12',
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
