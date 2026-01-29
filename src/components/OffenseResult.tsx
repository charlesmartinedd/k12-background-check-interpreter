import { Card, CardContent } from './ui/Card';
import type { OffenseInfo } from '../utils/codeLookup';

interface OffenseResultProps {
  offense: OffenseInfo;
  context?: string;
  disposition?: string;
}

export function OffenseResult({ offense, context, disposition }: OffenseResultProps) {
  // Determine the verdict for HR
  const getVerdict = () => {
    switch (offense.k12Impact) {
      case 'mandatory-disqualifier':
        return {
          text: 'CANNOT HIRE',
          subtext: 'Mandatory disqualifier under California law',
          bgColor: 'bg-[var(--color-danger-bg)]',
          borderColor: 'border-[var(--color-danger)]',
          textColor: 'text-[var(--color-danger)]',
        };
      case 'has-exemption-path':
        return {
          text: 'EXEMPTION AVAILABLE',
          subtext: 'May hire with valid exemption documentation',
          bgColor: 'bg-[var(--color-warning-bg)]',
          borderColor: 'border-[var(--color-warning)]',
          textColor: 'text-[var(--color-warning)]',
        };
      case 'non-disqualifying':
        return {
          text: 'OK TO PROCEED',
          subtext: 'Not a disqualifier for K-12 employment',
          bgColor: 'bg-[var(--color-success-bg)]',
          borderColor: 'border-[var(--color-success)]',
          textColor: 'text-[var(--color-success)]',
        };
      default:
        return {
          text: 'EXEMPTION AVAILABLE',
          subtext: 'Consult legal counsel for exemption options',
          bgColor: 'bg-[var(--color-warning-bg)]',
          borderColor: 'border-[var(--color-warning)]',
          textColor: 'text-[var(--color-warning)]',
        };
    }
  };

  const verdict = getVerdict();

  // Determine if felony or misdemeanor
  const getClassification = () => {
    if (offense.isViolentFelony) return { type: 'VIOLENT FELONY', color: 'text-[var(--color-danger)]' };
    if (offense.isSeriousFelony) return { type: 'SERIOUS FELONY', color: 'text-[var(--color-warning)]' };
    if (offense.category?.toLowerCase().includes('felony')) return { type: 'FELONY', color: 'text-[var(--color-warning)]' };
    if (offense.category?.toLowerCase().includes('misdemeanor')) return { type: 'MISDEMEANOR', color: 'text-[var(--color-text-secondary)]' };
    if (offense.category?.toLowerCase().includes('infraction')) return { type: 'INFRACTION', color: 'text-[var(--color-success)]' };
    return null;
  };

  const classification = getClassification();

  return (
    <Card
      variant="bordered"
      padding="none"
      className="overflow-hidden bg-[var(--color-surface)] border-[var(--color-border)]"
    >
      {/* Verdict Banner - Most Important Info */}
      <div className={`${verdict.bgColor} ${verdict.borderColor} border-l-4 px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${verdict.textColor}`}>
              {verdict.text}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {verdict.subtext}
            </p>
          </div>
          {classification && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-surface)] ${classification.color}`}>
              {classification.type}
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Code and Type */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-xl font-bold text-[var(--color-text-primary)]">
            {offense.code}
          </span>
          {offense.statute && offense.statute !== 'UNKNOWN' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              {offense.statute === 'NCIC' ? 'NCIC Code' : `${offense.statute} Code`}
            </span>
          )}
          {context && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              {context}
            </span>
          )}
        </div>

        {/* Charge Description - The Actual Offense */}
        <div className="mb-4">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            CHARGE DESCRIPTION
          </p>
          <p className="text-base text-[var(--color-text-primary)]">
            {offense.description && !offense.description.includes('requires legal verification')
              ? offense.description
              : `${offense.code} - ${offense.category || 'Criminal Offense'}`}
          </p>
        </div>

        {/* Disposition if available */}
        {disposition && disposition !== 'UNKNOWN' && (
          <div className="mb-4">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              DISPOSITION
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium
              ${disposition === 'CONVICTED' ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : ''}
              ${disposition === 'DISMISSED' || disposition === 'ACQUITTED' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : ''}
              ${disposition === 'PENDING' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : ''}
            `}>
              {disposition}
            </span>
          </div>
        )}

        {/* Legal Details */}
        {(offense.isViolentFelony || offense.isSeriousFelony || (offense.citations && offense.citations.length > 0)) && (
          <div className="pt-3 border-t border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              LEGAL BASIS
            </p>
            <div className="space-y-2">
              {offense.isViolentFelony && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span>
                  <span className="text-[var(--color-text-primary)]">
                    Listed under PC 667.5(c) - Violent Felonies
                  </span>
                </div>
              )}
              {offense.isSeriousFelony && !offense.isViolentFelony && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]"></span>
                  <span className="text-[var(--color-text-primary)]">
                    Listed under PC 1192.7(c) - Serious Felonies
                  </span>
                </div>
              )}
              {offense.citations && offense.citations.length > 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Citations: {offense.citations.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Exemption Info */}
        {offense.exemptionAvailable && offense.k12Impact !== 'non-disqualifying' && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-info-bg)]">
              <svg className="w-5 h-5 flex-shrink-0 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[var(--color-info)]">
                  Exemption Path Available
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Candidate may qualify through Certificate of Rehabilitation (PC 4852.01) or court finding of rehabilitation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HR Guidance Note */}
        {offense.note && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              HR GUIDANCE
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {offense.note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
