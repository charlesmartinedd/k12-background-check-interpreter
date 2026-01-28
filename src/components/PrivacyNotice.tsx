import { Card, CardContent } from './ui/Card';

export function PrivacyNotice() {
  return (
    <Card variant="bordered" padding="md" className="bg-[var(--color-background)]">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-success)] bg-opacity-10 text-[var(--color-success)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
              Privacy Protected
            </h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-3">
              This tool processes data entirely in your browser. No information is stored, transmitted, or saved.
              Only offense codes are extracted from uploaded documents - no names, dates of birth, or other personal information.
            </p>
            <ul className="text-caption text-[var(--color-text-secondary)] space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No data sent to servers
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No cookies or tracking
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Data cleared on page refresh
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Only offense codes extracted - no PII
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
    <Card variant="bordered" padding="md">
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
