import { Card, CardContent } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import type { OffenseInfo } from '../utils/codeLookup';

interface OffenseResultProps {
  offense: OffenseInfo;
  context?: string;
  disposition?: string;
}

export function OffenseResult({ offense, context, disposition }: OffenseResultProps) {
  return (
    <Card
      variant="bordered"
      padding="md"
      className="animate-slide-up"
    >
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-lg font-semibold text-[var(--color-text-primary)]">
                {offense.code} {offense.statute !== 'NCIC' && offense.statute !== 'UNKNOWN' ? offense.statute : ''}
              </span>
              {context && (
                <span className="text-caption bg-[var(--color-background)] px-2 py-0.5 rounded">
                  {context}
                </span>
              )}
            </div>
            <p className="text-body text-[var(--color-text-primary)] mb-2">
              {offense.description}
            </p>
            <div className="flex flex-wrap gap-2 text-caption">
              <span className="text-[var(--color-text-secondary)]">
                Category: {offense.category}
              </span>
              {disposition && disposition !== 'UNKNOWN' && (
                <>
                  <span className="text-[var(--color-text-tertiary)]">|</span>
                  <span className={`
                    ${disposition === 'CONVICTED' ? 'text-[var(--color-alert)]' : ''}
                    ${disposition === 'DISMISSED' || disposition === 'ACQUITTED' ? 'text-[var(--color-success)]' : ''}
                    ${disposition === 'PENDING' ? 'text-[var(--color-warning)]' : ''}
                  `}>
                    {disposition}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="sm:text-right">
            <StatusBadge status={offense.k12Impact} />
          </div>
        </div>

        {/* Additional details for disqualifying offenses */}
        {(offense.isViolentFelony || offense.isSeriousFelony) && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-light)]">
            <div className="flex flex-wrap gap-2">
              {offense.isViolentFelony && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-alert-bg)] text-[#C41E11] text-xs rounded-[var(--radius-sm)]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Violent Felony (PC 667.5(c))
                </span>
              )}
              {offense.isSeriousFelony && !offense.isViolentFelony && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-warning-bg)] text-[#995700] text-xs rounded-[var(--radius-sm)]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Serious Felony (PC 1192.7(c))
                </span>
              )}
            </div>
            {offense.citations && offense.citations.length > 0 && (
              <p className="text-caption mt-2">
                Legal Citation: {offense.citations.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Exemption path indicator */}
        {offense.exemptionAvailable && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-light)]">
            <p className="text-body-sm text-[var(--color-text-secondary)] flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                This offense may have an exemption pathway through Certificate of Rehabilitation or court finding of rehabilitation.
              </span>
            </p>
          </div>
        )}

        {/* Note if present */}
        {offense.note && (
          <p className="mt-2 text-caption text-[var(--color-text-secondary)] italic">
            Note: {offense.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
