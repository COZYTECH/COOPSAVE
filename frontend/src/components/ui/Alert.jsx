import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const Alert = ({ type = 'error', children }) => {
  const styles = {
    error: { className: 'border-red-700/20 bg-red-50 text-red-800', icon: AlertCircle },
    success: { className: 'border-pamoja-emerald/20 bg-pamoja-sage text-pamoja-forest', icon: CheckCircle2 },
    info: { className: 'border-pamoja-forest/10 bg-white text-pamoja-body', icon: Info }
  };
  const config = styles[type] || styles.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${config.className}`} role="alert">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
};
