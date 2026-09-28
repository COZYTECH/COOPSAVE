import { AlertCircle, CheckCircle2, Clock3, Info, Loader2 } from 'lucide-react';

const statusMap = {
  success: {
    label: 'Success',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800'
  },
  pending: {
    label: 'Pending',
    icon: Clock3,
    className: 'bg-orange-100 text-orange-800'
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-pamoja-sage text-pamoja-forest'
  },
  danger: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-800'
  },
  neutral: {
    label: 'Not available',
    icon: Info,
    className: 'bg-pamoja-sage text-pamoja-forest'
  }
};

export const StatusBadge = ({ status = 'neutral', children }) => {
  const config = statusMap[status] || statusMap.neutral;
  const Icon = config.icon;

  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', config.className].join(' ')}>
      <Icon className={['h-3.5 w-3.5', status === 'processing' ? 'animate-spin' : ''].join(' ')} aria-hidden="true" />
      {children || config.label}
    </span>
  );
};
