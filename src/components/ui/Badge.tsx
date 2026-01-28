import type { DisqualificationStatus } from '../../utils/codeLookup';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'alert' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}: BadgeProps) {
  const baseStyles = `
    inline-flex items-center font-medium
    rounded-[var(--radius-full)]
  `;

  const variants = {
    success: `
      bg-[var(--color-success-bg)]
      text-[#1D7A3F]
      border border-[var(--color-success-border)]
    `,
    warning: `
      bg-[var(--color-warning-bg)]
      text-[#995700]
      border border-[var(--color-warning-border)]
    `,
    alert: `
      bg-[var(--color-alert-bg)]
      text-[#C41E11]
      border border-[var(--color-alert-border)]
    `,
    info: `
      bg-[var(--color-info-bg)]
      text-[var(--color-info)]
      border border-[var(--color-info)]
      border-opacity-30
    `,
    neutral: `
      bg-[var(--color-background)]
      text-[var(--color-text-secondary)]
      border border-[var(--color-border)]
    `
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Status badge that automatically selects the right variant
 * based on disqualification status
 */
interface StatusBadgeProps {
  status: DisqualificationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const statusConfig: Record<DisqualificationStatus, { variant: BadgeProps['variant']; label: string }> = {
    'mandatory-disqualifier': { variant: 'alert', label: 'Mandatory Disqualifier' },
    'has-exemption-path': { variant: 'warning', label: 'Exemption Available' },
    'review-required': { variant: 'warning', label: 'Review Required' },
    'non-disqualifying': { variant: 'success', label: 'Not Disqualifying' },
    'unknown': { variant: 'info', label: 'Verify Manually' }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
