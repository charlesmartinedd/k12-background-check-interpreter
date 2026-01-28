import { useState, useCallback } from 'react';
import { CodeEntry } from './components/CodeEntry';
import { PdfUploader } from './components/PdfUploader';
import { AnalysisReport } from './components/AnalysisReport';
import { PrivacyNotice, Disclaimer, BestPractices } from './components/PrivacyNotice';
import { Button } from './components/ui/Button';
import { ToastContainer, useToast } from './components/ui/Toast';
import type { ExtractedCode } from './utils/codeOnlyParser';
import { lookupCodes } from './utils/codeLookup';
import type { OffenseInfo } from './utils/codeLookup';
import { analyzeOffenses } from './utils/disqualificationCheck';
import type { DisqualificationAnalysis } from './utils/disqualificationCheck';

type InputMode = 'pdf' | 'manual';

function App() {
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [extractedCodes, setExtractedCodes] = useState<ExtractedCode[]>([]);
  const [offenses, setOffenses] = useState<OffenseInfo[]>([]);
  const [analysis, setAnalysis] = useState<DisqualificationAnalysis | null>(null);
  const [showResults, setShowResults] = useState(false);

  const toast = useToast();

  const handleCodesSubmit = useCallback((codes: ExtractedCode[]) => {
    // Look up each code
    const offenseInfos = lookupCodes(codes.map(c => c.code));

    // Analyze for K-12 disqualification
    const analysisResult = analyzeOffenses(offenseInfos);

    setExtractedCodes(codes);
    setOffenses(offenseInfos);
    setAnalysis(analysisResult);
    setShowResults(true);

    toast.success(`Analyzed ${codes.length} offense code${codes.length !== 1 ? 's' : ''}`);
  }, [toast]);

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, [toast]);

  const handleClear = useCallback(() => {
    setExtractedCodes([]);
    setOffenses([]);
    setAnalysis(null);
    setShowResults(false);
    toast.info('All data cleared');
  }, [toast]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border-light)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                K-12 Background Check Interpreter
              </h1>
              <p className="text-caption mt-1 hidden sm:block">
                Privacy-first tool for K-12 HR professionals
              </p>
            </div>
            {showResults && (
              <Button variant="danger" size="sm" onClick={handleClear}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {!showResults ? (
          <div className="space-y-6">
            {/* Privacy Notice */}
            <PrivacyNotice />

            {/* Input Mode Toggle */}
            <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
              <button
                onClick={() => setInputMode('manual')}
                className={`
                  flex-1 py-2.5 px-4 rounded-[var(--radius-md)]
                  font-medium text-sm
                  transition-all duration-200
                  ${inputMode === 'manual'
                    ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
                  }
                `}
              >
                Enter Codes Manually
              </button>
              <button
                onClick={() => setInputMode('pdf')}
                className={`
                  flex-1 py-2.5 px-4 rounded-[var(--radius-md)]
                  font-medium text-sm
                  transition-all duration-200
                  ${inputMode === 'pdf'
                    ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
                  }
                `}
              >
                Upload PDF
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
        ) : analysis && (
          <AnalysisReport
            analysis={analysis}
            offenses={offenses}
            extractedCodes={extractedCodes}
            onClear={handleClear}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-light)] bg-[var(--color-surface)] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <Disclaimer />
        </div>
      </footer>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
}

export default App;
