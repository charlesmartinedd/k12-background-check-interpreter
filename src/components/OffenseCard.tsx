import type { OffenseInfo, DisqualificationStatus } from '../utils/codeLookup';

interface OffenseCardProps {
  offense: OffenseInfo;
  onClick: () => void;
}

export function OffenseCard({ offense, onClick }: OffenseCardProps) {
  // Get status styling and action text
  const getStatusInfo = (status: DisqualificationStatus) => {
    switch (status) {
      case 'mandatory-disqualifier':
        return {
          dotColor: 'bg-[var(--color-danger)]',
          borderColor: 'border-l-[var(--color-danger)]',
          actionText: 'Cannot hire for this offense',
          actionColor: 'text-[var(--color-danger)]',
        };
      case 'has-exemption-path':
        return {
          dotColor: 'bg-[var(--color-warning)]',
          borderColor: 'border-l-[var(--color-warning)]',
          actionText: 'May hire with exemption',
          actionColor: 'text-[var(--color-warning)]',
        };
      case 'non-disqualifying':
        return {
          dotColor: 'bg-[var(--color-success)]',
          borderColor: 'border-l-[var(--color-success)]',
          actionText: 'OK to proceed with hiring',
          actionColor: 'text-[var(--color-success)]',
        };
      default:
        return {
          dotColor: 'bg-[var(--color-text-tertiary)]',
          borderColor: 'border-l-[var(--color-text-tertiary)]',
          actionText: 'Requires further review',
          actionColor: 'text-[var(--color-text-secondary)]',
        };
    }
  };

  const status = getStatusInfo(offense.k12Impact);

  // Get short name - first few words
  const getShortName = (description: string | undefined): string => {
    if (!description) return 'Criminal Offense';
    const cleaned = description.replace(/[()]/g, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length <= 3) return cleaned;
    return words.slice(0, 3).join(' ');
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4
        bg-[var(--color-surface)] border border-[var(--color-border)]
        border-l-4 ${status.borderColor}
        rounded-[var(--radius-lg)]
        hover:bg-[var(--color-surface-elevated)]
        hover:shadow-[var(--shadow-md)]
        hover:-translate-y-0.5
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
        cursor-pointer
        group
      `}
    >
      {/* Code and status dot */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
          {offense.code}
        </span>
        <span className={`w-3 h-3 rounded-full ${status.dotColor} flex-shrink-0 mt-1`} />
      </div>

      {/* Short name */}
      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
        {getShortName(offense.description)}
      </p>

      {/* Action guidance */}
      <p className={`text-xs font-medium mt-2 ${status.actionColor}`}>
        {status.actionText}
      </p>

      {/* Click indicator */}
      <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex items-center justify-end text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors">
        <span>View details</span>
        <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
