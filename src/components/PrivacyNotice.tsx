import { Card, CardContent } from './ui/Card';

export function PrivacyNotice() {
  return (
    <Card variant="bordered" padding="md" className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
              Background Check Assistant for HR Departments
            </h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-3">
              Streamline employee screening for California K-12 public schools. Upload background check documents
              to automatically identify offense codes and translate them into clear, actionable summaries.
              Only offense codes are extracted - no personal information is processed or stored.
            </p>
            <ul className="text-caption text-[var(--color-text-secondary)] space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Flags disqualifying offenses under California law
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Translates offense codes to plain language
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Categorizes results by severity and relevance
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Supports compliant hiring decisions
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Disclaimer() {
  return (
    <div className="text-caption text-[var(--color-text-tertiary)] space-y-3">
      <p>
        <strong>Legal Disclaimer:</strong> This tool is for educational purposes only. It does not
        constitute legal advice. Employment decisions should be made in consultation with legal
        counsel and in compliance with all applicable laws including the California Fair Chance Act.
      </p>
      <p>
        <strong>Fair Hiring Reminder:</strong> Most convictions do not automatically disqualify
        candidates from K-12 employment. Only violent felonies (PC 667.5(c)) and serious felonies
        (PC 1192.7(c)) are mandatory disqualifiers - and even those may have exemption pathways.
        Give every candidate fair consideration.
      </p>
    </div>
  );
}

export function BestPractices() {
  return (
    <Card variant="bordered" padding="md" className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardContent>
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
          Best Practices
        </h3>
        <ul className="text-body-sm text-[var(--color-text-secondary)] space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)]">1.</span>
            Use on organization-owned, secured devices only
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)]">2.</span>
            Never screenshot or save results with identifying info
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)]">3.</span>
            Process checks in private, not in shared spaces
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)]">4.</span>
            Follow your district's background check handling procedures
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)]">5.</span>
            Click "Clear All" before processing the next background check
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
