import { useState, useCallback } from 'react';
import { LandingPageV2 } from './components/LandingPageV2';
import { AnalysisReportV2 } from './components/AnalysisReportV2';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { ToastContainer, useToast } from './components/ui/Toast';
import type { ExtractedCode } from './utils/codeOnlyParser';
import { performComprehensiveAnalysis, type ComprehensiveAnalysis } from './services/analysis';
import type { OffenseInfo, DisqualificationStatus } from './utils/codeLookup';

type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

// Transform ComprehensiveAnalysis to OffenseInfo[] for AnalysisReportV2
function transformToOffenseInfoArray(analysis: ComprehensiveAnalysis): OffenseInfo[] {
  return analysis.codes.map((code, i) => {
    const aiResult = analysis.aiAnalysis[i];
    const category = aiResult?.k12Classification || code.category;
    const isViolent =
      category === 'mandatory-disqualifier' &&
      (code.description?.toLowerCase().includes('violent') ||
        code.description?.toLowerCase().includes('murder') ||
        code.description?.toLowerCase().includes('rape'));
    const isSerious = category === 'mandatory-disqualifier' || category === 'has-exemption-path';

    return {
      code: code.code,
      statute: code.codeType,
      description: code.description,
      category:
        code.codeType === 'PC'
          ? 'Penal Code'
          : code.codeType === 'HS'
          ? 'Health & Safety'
          : code.codeType === 'VC'
          ? 'Vehicle Code'
          : 'Other',
      k12Impact: category as DisqualificationStatus,
      citations: code.citations,
      note: aiResult?.hrGuidance,
      isViolentFelony: isViolent,
      isSeriousFelony: isSerious,
      exemptionAvailable:
        category === 'has-exemption-path' || (aiResult?.exemptionPathways?.length || 0) > 0,
      source: code.verificationSource || 'local',
      confidence: code.verificationConfidence || 'high',
      verified: code.verified ?? true,
    };
  });
}

function AppV2() {
  const [extractedCodes, setExtractedCodes] = useState<ExtractedCode[]>([]);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisProgress, setAnalysisProgress] = useState('');

  const toast = useToast();

  const handleCodesSubmit = useCallback(
    async (codes: ExtractedCode[]) => {
      setExtractedCodes(codes);
      setAnalysisStatus('analyzing');
      setAnalysisProgress('Starting AI analysis...');

      try {
        // Extract code strings
        const codeStrings = codes.map((c) => c.code);

        setAnalysisProgress('Retrieving legal information...');

        // Perform comprehensive AI analysis
        const result = await performComprehensiveAnalysis(codeStrings);

        setAnalysis(result);
        setAnalysisStatus('complete');

        // Force scroll to top immediately after render
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
        });

        toast.success(`Analyzed ${codes.length} offense code${codes.length !== 1 ? 's' : ''} with AI`);
      } catch (error) {
        console.error('Analysis error:', error);
        setAnalysisStatus('error');
        toast.error('Analysis failed. Please check your API keys and try again.');
      }
    },
    [toast]
  );

  const handleError = useCallback(
    (error: string) => {
      toast.error(error);
    },
    [toast]
  );

  const handleClear = useCallback(() => {
    setExtractedCodes([]);
    setAnalysis(null);
    setAnalysisStatus('idle');
    setAnalysisProgress('');
    toast.info('All data cleared');
  }, [toast]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Compact Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
              K-12 Background Check
            </h1>
            {analysisStatus === 'complete' && (
              <Button variant="danger" size="sm" onClick={handleClear}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Centered vertically on idle */}
      <main className={`flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 ${
        analysisStatus === 'idle' ? 'flex items-center py-4' : 'py-6'
      }`}>
        {analysisStatus === 'idle' && (
          <div className="w-full">
            <LandingPageV2 onCodesSubmit={handleCodesSubmit} onError={handleError} />
          </div>
        )}

        {analysisStatus === 'analyzing' && (
          <Card className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[var(--color-primary-light)] rounded-full animate-spin border-t-[var(--color-primary)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[var(--color-primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Analyzing Background Check
                </h3>
                <p className="text-[var(--color-text-secondary)] mt-1">{analysisProgress}</p>
              </div>
            </div>
          </Card>
        )}

        {analysisStatus === 'complete' && analysis && (
          <AnalysisReportV2
            analysis={analysis}
            offenses={transformToOffenseInfoArray(analysis)}
            extractedCodes={extractedCodes}
            onClear={handleClear}
          />
        )}

        {analysisStatus === 'error' && (
          <Card className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-[var(--color-danger-bg)] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--color-danger)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Analysis Failed
                </h3>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Please check your configuration and try again.
                </p>
              </div>
              <Button onClick={handleClear}>Try Again</Button>
            </div>
          </Card>
        )}
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
          <p className="text-xs text-center text-[var(--color-text-tertiary)]">
            Informational only. Consult legal counsel for hiring decisions. Most convictions do not disqualify candidates.
          </p>
        </div>
      </footer>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
}

export default AppV2;
