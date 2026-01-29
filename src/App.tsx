import { useState, useCallback } from 'react';
import { CodeEntry } from './components/CodeEntry';
import { PdfUploader } from './components/PdfUploader';
import { AnalysisReport } from './components/AnalysisReport';
import { AIChat } from './components/AIChat';
import { PrivacyNotice, Disclaimer, BestPractices } from './components/PrivacyNotice';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { ToastContainer, useToast } from './components/ui/Toast';
import type { ExtractedCode } from './utils/codeOnlyParser';
import { performComprehensiveAnalysis, type ComprehensiveAnalysis } from './services/analysis';
import type { DisqualificationAnalysis } from './utils/disqualificationCheck';
import type { OffenseInfo, DisqualificationStatus } from './utils/codeLookup';

type InputMode = 'pdf' | 'manual';
type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

// Transform ComprehensiveAnalysis to OffenseInfo[] for AnalysisReport
function transformToOffenseInfoArray(analysis: ComprehensiveAnalysis): OffenseInfo[] {
  return analysis.codes.map((code, i) => {
    const aiResult = analysis.aiAnalysis[i];
    const category = aiResult?.k12Classification || code.category;
    const isViolent = category === 'mandatory-disqualifier' &&
      (code.description?.toLowerCase().includes('violent') ||
       code.description?.toLowerCase().includes('murder') ||
       code.description?.toLowerCase().includes('rape'));
    const isSerious = category === 'mandatory-disqualifier' || category === 'has-exemption-path';

    return {
      code: code.code,
      statute: code.codeType,
      description: code.description,
      category: code.codeType === 'PC' ? 'Penal Code' : code.codeType === 'HS' ? 'Health & Safety' : code.codeType === 'VC' ? 'Vehicle Code' : 'Other',
      k12Impact: category as DisqualificationStatus,
      citations: code.citations,
      note: aiResult?.hrGuidance,
      isViolentFelony: isViolent,
      isSeriousFelony: isSerious,
      exemptionAvailable: category === 'has-exemption-path' || (aiResult?.exemptionPathways?.length || 0) > 0,
      source: code.verificationSource || 'local',
      confidence: code.verificationConfidence || 'high',
      verified: code.verified ?? true,
    };
  });
}

// Transform ComprehensiveAnalysis to DisqualificationAnalysis for AnalysisReport
function transformToDisqualificationAnalysis(analysis: ComprehensiveAnalysis): DisqualificationAnalysis {
  const offenses = transformToOffenseInfoArray(analysis);

  // Map any review-required or unknown to has-exemption-path
  const normalizedOffenses = offenses.map(o => ({
    ...o,
    k12Impact: (o.k12Impact === 'review-required' as any || o.k12Impact === 'unknown')
      ? 'has-exemption-path' as DisqualificationStatus
      : o.k12Impact
  }));

  const mandatoryDisqualifiers = normalizedOffenses.filter(o => o.k12Impact === 'mandatory-disqualifier');
  const hasExemptionPath = normalizedOffenses.filter(o => o.k12Impact === 'has-exemption-path');
  const nonDisqualifying = normalizedOffenses.filter(o => o.k12Impact === 'non-disqualifying');

  let overallStatus: DisqualificationStatus;
  if (mandatoryDisqualifiers.length > 0) {
    overallStatus = 'mandatory-disqualifier';
  } else if (hasExemptionPath.length > 0) {
    overallStatus = 'has-exemption-path';
  } else {
    overallStatus = 'non-disqualifying';
  }

  return {
    overallStatus,
    mandatoryDisqualifiers,
    hasExemptionPath,
    nonDisqualifying,
    recommendations: [analysis.summary.overallRecommendation],
    educationalResources: [],
  };
}

function App() {
  const [inputMode, setInputMode] = useState<InputMode>('pdf');
  const [extractedCodes, setExtractedCodes] = useState<ExtractedCode[]>([]);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisProgress, setAnalysisProgress] = useState('');

  const toast = useToast();

  const handleCodesSubmit = useCallback(async (codes: ExtractedCode[]) => {
    setExtractedCodes(codes);
    setAnalysisStatus('analyzing');
    setAnalysisProgress('Starting AI analysis...');

    try {
      // Extract code strings
      const codeStrings = codes.map(c => c.code);

      setAnalysisProgress('Retrieving legal information...');

      // Perform comprehensive AI analysis
      const result = await performComprehensiveAnalysis(codeStrings);

      setAnalysis(result);
      setAnalysisStatus('complete');
      toast.success(`Analyzed ${codes.length} offense code${codes.length !== 1 ? 's' : ''} with AI`);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisStatus('error');
      toast.error('Analysis failed. Please check your API keys and try again.');
    }
  }, [toast]);

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, [toast]);

  const handleClear = useCallback(() => {
    setExtractedCodes([]);
    setAnalysis(null);
    setAnalysisStatus('idle');
    setAnalysisProgress('');
    toast.info('All data cleared');
  }, [toast]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                K-12 Background Check Interpreter
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                California Education Code Compliance Tool
              </p>
            </div>
            {analysisStatus === 'complete' && (
              <Button variant="danger" size="sm" onClick={handleClear}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {analysisStatus === 'idle' && (
          <div className="space-y-6">
            {/* Privacy Notice */}
            <PrivacyNotice />

            {/* Input Mode Toggle - PDF first */}
            <div className="flex gap-2 p-1.5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
              <button
                onClick={() => setInputMode('pdf')}
                className={`
                  flex-1 py-3 px-4 rounded-xl
                  font-medium text-sm
                  transition-all duration-200
                  ${inputMode === 'pdf'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Upload Document
                </span>
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={`
                  flex-1 py-3 px-4 rounded-xl
                  font-medium text-sm
                  transition-all duration-200
                  ${inputMode === 'manual'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Enter Manually
                </span>
              </button>
            </div>

            {/* Input Component */}
            {inputMode === 'manual' ? (
              <CodeEntry onCodesSubmit={handleCodesSubmit} />
            ) : (
              <PdfUploader
                onCodesExtracted={handleCodesSubmit}
                onError={handleError}
              />
            )}

            {/* Best Practices */}
            <BestPractices />
          </div>
        )}

        {analysisStatus === 'analyzing' && (
          <Card className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[var(--color-primary-light)] rounded-full animate-spin border-t-[var(--color-primary)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Analyzing Background Check
                </h3>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  {analysisProgress}
                </p>
              </div>
            </div>
          </Card>
        )}

        {analysisStatus === 'complete' && analysis && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-[var(--color-surface)] border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Analysis Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)]">
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {analysis.summary.totalCodes}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Total Codes</p>
                </div>
                <div className="text-center p-3 bg-[var(--color-danger-bg)] rounded-xl border border-[var(--color-danger-border)]">
                  <p className="text-2xl font-bold text-[var(--color-danger)]">
                    {analysis.summary.mandatoryDisqualifiers}
                  </p>
                  <p className="text-xs text-[var(--color-danger)]">Disqualifiers</p>
                </div>
                <div className="text-center p-3 bg-[var(--color-warning-bg)] rounded-xl border border-[var(--color-warning-border)]">
                  <p className="text-2xl font-bold text-[var(--color-warning)]">
                    {analysis.summary.hasExemptionPath}
                  </p>
                  <p className="text-xs text-[var(--color-warning)]">Exemption Available</p>
                </div>
                <div className="text-center p-3 bg-[var(--color-success-bg)] rounded-xl border border-[var(--color-success-border)]">
                  <p className="text-2xl font-bold text-[var(--color-success)]">
                    {analysis.summary.nonDisqualifying}
                  </p>
                  <p className="text-xs text-[var(--color-success)]">Non-Disqualifying</p>
                </div>
              </div>
              <div className="p-4 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-primary)]">
                  {analysis.summary.overallRecommendation}
                </p>
              </div>
            </Card>

            {/* Detailed Analysis */}
            <AnalysisReport
              analysis={transformToDisqualificationAnalysis(analysis)}
              offenses={transformToOffenseInfoArray(analysis)}
              extractedCodes={extractedCodes}
              onClear={handleClear}
            />

            {/* AI Chat */}
            <AIChat analysis={analysis} />
          </div>
        )}

        {analysisStatus === 'error' && (
          <Card className="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-[var(--color-danger-bg)] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              <Button onClick={handleClear}>
                Try Again
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <Disclaimer />
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              This tool provides informational analysis based on California Education Code.
              Only offense codes are processed - no personal information is stored or transmitted.
              Results are informational and do not constitute legal advice.
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
}

export default App;
