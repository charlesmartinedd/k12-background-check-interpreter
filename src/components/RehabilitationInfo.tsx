import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import type { EducationalResource } from '../utils/disqualificationCheck';

interface RehabilitationInfoProps {
  resources: EducationalResource[];
}

export function RehabilitationInfo({ resources }: RehabilitationInfoProps) {
  if (resources.length === 0) {
    return null;
  }

  const getResourceIcon = (type: EducationalResource['type']) => {
    switch (type) {
      case 'statute':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'process':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'resource':
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: EducationalResource['type']) => {
    switch (type) {
      case 'statute':
        return 'Legal Reference';
      case 'process':
        return 'Exemption Process';
      case 'resource':
        return 'Resource';
      default:
        return 'Information';
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>Exemption & Rehabilitation Resources</CardTitle>
        <CardDescription>
          Information about exemption pathways and rehabilitation processes
          that may be relevant to this background check.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((resource, index) => (
            <ResourceCard key={index} resource={resource} icon={getResourceIcon(resource.type)} typeLabel={getTypeLabel(resource.type)} />
          ))}
        </div>

        <div className="mt-6 p-4 bg-[var(--color-info-bg)] rounded-[var(--radius-md)]">
          <p className="text-body-sm text-[var(--color-info)] flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Important:</strong> Even mandatory disqualifiers may have exemption
              pathways. Candidates who have obtained a Certificate of Rehabilitation and
              Pardon or a court finding of rehabilitation may be eligible for employment.
              Always consult with legal counsel for specific situations.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResourceCardProps {
  resource: EducationalResource;
  icon: React.ReactNode;
  typeLabel: string;
}

function ResourceCard({ resource, icon, typeLabel }: ResourceCardProps) {
  const content = (
    <div className={`
      h-full p-4 border rounded-[var(--radius-md)]
      transition-all duration-200
      ${resource.url
        ? 'hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] cursor-pointer'
        : 'border-[var(--color-border)]'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-[var(--color-text-primary)] truncate">
              {resource.title}
            </h4>
            {resource.url && (
              <svg className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mb-2">
            {typeLabel}
          </p>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            {resource.description}
          </p>
        </div>
      </div>
    </div>
  );

  if (resource.url) {
    return (
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline"
      >
        {content}
      </a>
    );
  }

  return content;
}
