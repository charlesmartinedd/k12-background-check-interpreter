import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { OffenseResult } from './OffenseResult';
import { DecisionFramework } from './DecisionFramework';
import { RehabilitationInfo } from './RehabilitationInfo';
import type { DisqualificationAnalysis } from '../utils/disqualificationCheck';
import type { ExtractedCode } from '../utils/codeOnlyParser';
import type { OffenseInfo } from '../utils/codeLookup';

interface AnalysisReportProps {
  analysis: DisqualificationAnalysis;
  offenses: OffenseInfo[];
  extractedCodes: ExtractedCode[];
  onClear: () => void;
}

export function AnalysisReport({
  analysis,
  offenses,
  extractedCodes,
  onClear
}: AnalysisReportProps) {
  // Create a map of code to extracted info for context/disposition
  const codeContextMap = new Map<string, ExtractedCode>();
  extractedCodes.forEach(ec => {
    const normalizedCode = ec.code.split(' ')[0]; // Get just the number part
    codeContextMap.set(normalizedCode, ec);
    codeContextMap.set(ec.code, ec);
  });

  const getExtractedInfo = (offense: OffenseInfo): ExtractedCode | undefined => {
    return codeContextMap.get(offense.code) || codeContextMap.get(offense.code.split(' ')[0]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Card */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                {offenses.length} offense{offenses.length !== 1 ? 's' : ''} analyzed
              </CardDescription>
            </div>
            <StatusBadge status={analysis.overallStatus} size="md" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-[var(--color-alert-bg)] rounded-[var(--radius-md)]">
              <div className="text-2xl font-bold text-[#C41E11]">
                {analysis.mandatoryDisqualifiers.length}
              </div>
              <div className="text-xs text-[#C41E11]">Disqualifying</div>
            </div>
            <div className="text-center p-3 bg-[var(--color-warning-bg)] rounded-[var(--radius-md)]">
              <div className="text-2xl font-bold text-[#995700]">
                {analysis.hasExemptionPath.length + analysis.reviewRequired.length}
              </div>
              <div className="text-xs text-[#995700]">Need Review</div>
            </div>
            <div className="text-center p-3 bg-[var(--color-success-bg)] rounded-[var(--radius-md)]">
              <div className="text-2xl font-bold text-[#1D7A3F]">
                {analysis.nonDisqualifying.length}
              </div>
              <div className="text-xs text-[#1D7A3F]">Not Disqualifying</div>
            </div>
            <div className="text-center p-3 bg-[var(--color-info-bg)] rounded-[var(--radius-md)]">
              <div className="text-2xl font-bold text-[var(--color-info)]">
                {analysis.unknown.length}
              </div>
              <div className="text-xs text-[var(--color-info)]">Unknown</div>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-[var(--color-background)] rounded-[var(--radius-md)] p-4">
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
                Recommendations
              </h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-body-sm text-[var(--color-text-secondary)]">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="danger" onClick={onClear}>
            Clear All Results
          </Button>
        </CardFooter>
      </Card>

      {/* Mandatory Disqualifiers Section */}
      {analysis.mandatoryDisqualifiers.length > 0 && (
        <section>
          <h3 className="text-heading-3 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-alert)]"></span>
            Mandatory Disqualifiers ({analysis.mandatoryDisqualifiers.length})
          </h3>
          <div className="space-y-3">
            {analysis.mandatoryDisqualifiers.map((offense, index) => {
              const extracted = getExtractedInfo(offense);
              return (
                <OffenseResult
                  key={`disq-${index}`}
                  offense={offense}
                  context={extracted?.context}
                  disposition={extracted?.disposition}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Exemption Path Available Section */}
      {analysis.hasExemptionPath.length > 0 && (
        <section>
          <h3 className="text-heading-3 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-warning)]"></span>
            Exemption Path Available ({analysis.hasExemptionPath.length})
          </h3>
          <div className="space-y-3">
            {analysis.hasExemptionPath.map((offense, index) => {
              const extracted = getExtractedInfo(offense);
              return (
                <OffenseResult
                  key={`exempt-${index}`}
                  offense={offense}
                  context={extracted?.context}
                  disposition={extracted?.disposition}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Review Required Section */}
      {analysis.reviewRequired.length > 0 && (
        <section>
          <h3 className="text-heading-3 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-warning)]"></span>
            Review Required ({analysis.reviewRequired.length})
          </h3>
          <div className="space-y-3">
            {analysis.reviewRequired.map((offense, index) => {
              const extracted = getExtractedInfo(offense);
              return (
                <OffenseResult
                  key={`review-${index}`}
                  offense={offense}
                  context={extracted?.context}
                  disposition={extracted?.disposition}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Non-Disqualifying Section */}
      {analysis.nonDisqualifying.length > 0 && (
        <section>
          <h3 className="text-heading-3 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-success)]"></span>
            Not Disqualifying ({analysis.nonDisqualifying.length})
          </h3>
          <div className="space-y-3">
            {analysis.nonDisqualifying.map((offense, index) => {
              const extracted = getExtractedInfo(offense);
              return (
                <OffenseResult
                  key={`nonDisq-${index}`}
                  offense={offense}
                  context={extracted?.context}
                  disposition={extracted?.disposition}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Unknown Section */}
      {analysis.unknown.length > 0 && (
        <section>
          <h3 className="text-heading-3 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-info)]"></span>
            Verify Manually ({analysis.unknown.length})
          </h3>
          <div className="space-y-3">
            {analysis.unknown.map((offense, index) => {
              const extracted = getExtractedInfo(offense);
              return (
                <OffenseResult
                  key={`unknown-${index}`}
                  offense={offense}
                  context={extracted?.context}
                  disposition={extracted?.disposition}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Decision Framework */}
      {(analysis.reviewRequired.length > 0 ||
        analysis.nonDisqualifying.length > 0 ||
        analysis.hasExemptionPath.length > 0) && (
          <DecisionFramework status={analysis.overallStatus} />
        )}

      {/* Rehabilitation Resources */}
      {(analysis.mandatoryDisqualifiers.length > 0 ||
        analysis.hasExemptionPath.length > 0) && (
          <RehabilitationInfo resources={analysis.educationalResources} />
        )}
    </div>
  );
}
