import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { OffenseInfo, DisqualificationStatus } from '../utils/codeLookup';
import type { AIAnalysisResult } from '../types/legal';

interface OffenseModalProps {
  offense: OffenseInfo;
  aiAnalysis?: AIAnalysisResult;
  isOpen: boolean;
  onClose: () => void;
  onAskQuestion?: (question: string) => void;
  context?: string;
  disposition?: string;
}

export function OffenseModal({
  offense,
  aiAnalysis,
  isOpen,
  onClose,
  onAskQuestion,
  context,
  disposition,
}: OffenseModalProps) {
  // Get verdict styling
  const getVerdict = (status: DisqualificationStatus) => {
    switch (status) {
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
          text: 'REVIEW NEEDED',
          subtext: 'Consult legal counsel for guidance',
          bgColor: 'bg-[var(--color-warning-bg)]',
          borderColor: 'border-[var(--color-warning)]',
          textColor: 'text-[var(--color-warning)]',
        };
    }
  };

  const verdict = getVerdict(offense.k12Impact);

  // Get classification info
  const getClassification = () => {
    if (offense.isViolentFelony)
      return { type: 'VIOLENT FELONY', color: 'text-[var(--color-danger)]' };
    if (offense.isSeriousFelony)
      return { type: 'SERIOUS FELONY', color: 'text-[var(--color-warning)]' };
    if (offense.category?.toLowerCase().includes('felony'))
      return { type: 'FELONY', color: 'text-[var(--color-warning)]' };
    if (offense.category?.toLowerCase().includes('misdemeanor'))
      return { type: 'MISDEMEANOR', color: 'text-[var(--color-text-secondary)]' };
    if (offense.category?.toLowerCase().includes('infraction'))
      return { type: 'INFRACTION', color: 'text-[var(--color-success)]' };
    return null;
  };

  const classification = getClassification();

  const handleAskQuestion = () => {
    if (onAskQuestion) {
      const question = `Tell me more about ${offense.code}. What are the exemption options and HR considerations for this offense?`;
      onAskQuestion(question);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Verdict Banner */}
        <div
          className={`${verdict.bgColor} ${verdict.borderColor} border-l-4 px-4 py-4 rounded-r-[var(--radius-md)] -mx-6 -mt-6`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xl font-bold ${verdict.textColor}`}>{verdict.text}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{verdict.subtext}</p>
            </div>
            {classification && (
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--color-surface)] ${classification.color}`}
              >
                {classification.type}
              </span>
            )}
          </div>
        </div>

        {/* What You're Seeing - Brief Explainer */}
        <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] p-3 border border-[var(--color-border)]">
          <p>
            <strong className="text-[var(--color-text-primary)]">What this means:</strong> This offense was found on the candidate's background check. Below you'll find the legal classification, HR guidance, and any available exemption options under California Education Code.
          </p>
        </div>

        {/* Code Header */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">
            {offense.code}
          </span>
          {offense.statute && offense.statute !== 'UNKNOWN' && (
            <span className="text-sm font-medium px-3 py-1 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              {offense.statute === 'NCIC' ? 'NCIC Code' : `${offense.statute} Code`}
            </span>
          )}
          {context && (
            <span className="text-sm px-3 py-1 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              {context}
            </span>
          )}
        </div>

        {/* Charge Description */}
        <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
            Charge Description
          </h3>
          <p className="text-base text-[var(--color-text-primary)]">
            {offense.description && !offense.description.includes('requires legal verification')
              ? offense.description
              : `${offense.code} - ${offense.category || 'Criminal Offense'}`}
          </p>
        </div>

        {/* Disposition if available */}
        {disposition && disposition !== 'UNKNOWN' && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Disposition
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium
              ${disposition === 'CONVICTED' ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : ''}
              ${disposition === 'DISMISSED' || disposition === 'ACQUITTED' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : ''}
              ${disposition === 'PENDING' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : ''}
            `}
            >
              {disposition}
            </span>
          </div>
        )}

        {/* Legal Basis */}
        {(offense.isViolentFelony ||
          offense.isSeriousFelony ||
          (offense.citations && offense.citations.length > 0)) && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Legal Basis
            </h3>
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
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-info-bg)] border border-[var(--color-info)]">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 text-[var(--color-info)] mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-[var(--color-info)]">
                  Exemption Path Available
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Candidate may qualify through Certificate of Rehabilitation (PC 4852.01) or court
                  finding of rehabilitation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HR Guidance */}
        {(offense.note || aiAnalysis?.hrGuidance) && (
          <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              HR Guidance
            </h3>
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
              {aiAnalysis?.hrGuidance || offense.note}
            </p>
          </div>
        )}

        {/* AI Explanation */}
        {aiAnalysis?.explanation && (
          <div className="bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              AI Analysis
            </h3>
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
              {aiAnalysis.explanation}
            </p>
          </div>
        )}

        {/* Exemption Pathways */}
        {aiAnalysis?.exemptionPathways && aiAnalysis.exemptionPathways.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Exemption Pathways
            </h3>
            <ul className="space-y-2">
              {aiAnalysis.exemptionPathways.map((pathway, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span className="text-[var(--color-text-primary)]">{pathway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onAskQuestion && (
            <Button
              variant="primary"
              onClick={handleAskQuestion}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              }
            >
              Ask about this offense
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
