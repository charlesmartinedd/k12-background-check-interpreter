import { useState, useCallback, useEffect } from 'react';
import { OffenseCard } from './OffenseCard';
import { OffenseModal } from './OffenseModal';
import { ChatPanel, generateWelcomeMessage } from './ChatPanel';
import { ChatDrawer } from './ChatDrawer';
import type { ComprehensiveAnalysis } from '../services/analysis';
import type { OffenseInfo } from '../utils/codeLookup';
import type { AIAnalysisResult } from '../types/legal';
import type { ExtractedCode } from '../utils/codeOnlyParser';

interface AnalysisReportV2Props {
  analysis: ComprehensiveAnalysis;
  offenses: OffenseInfo[];
  extractedCodes: ExtractedCode[];
  onClear: () => void;
}

export function AnalysisReportV2({
  analysis,
  offenses,
  extractedCodes,
}: AnalysisReportV2Props) {
  const [selectedOffense, setSelectedOffense] = useState<{
    offense: OffenseInfo;
    aiAnalysis?: AIAnalysisResult;
    context?: string;
    disposition?: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [chatInitialQuestion, setChatInitialQuestion] = useState<string | undefined>();
  const [desktopChatQuestion, setDesktopChatQuestion] = useState<string | undefined>();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create a map of code to extracted info for context/disposition
  const codeContextMap = new Map<string, ExtractedCode>();
  extractedCodes.forEach((ec) => {
    const normalizedCode = ec.code.split(' ')[0];
    codeContextMap.set(normalizedCode, ec);
    codeContextMap.set(ec.code, ec);
  });

  const getExtractedInfo = (offense: OffenseInfo): ExtractedCode | undefined => {
    return codeContextMap.get(offense.code) || codeContextMap.get(offense.code.split(' ')[0]);
  };

  // Get AI analysis for a specific offense
  const getAIAnalysis = (offense: OffenseInfo): AIAnalysisResult | undefined => {
    return analysis.aiAnalysis.find(
      (a) => a.code === offense.code || offense.code.includes(a.code) || a.code.includes(offense.code)
    );
  };

  // Handle card click
  const handleCardClick = (offense: OffenseInfo) => {
    const extracted = getExtractedInfo(offense);
    const offenseAiAnalysis = getAIAnalysis(offense);
    setSelectedOffense({
      offense,
      aiAnalysis: offenseAiAnalysis,
      context: extracted?.context,
      disposition: extracted?.disposition,
    });
  };

  // Handle ask question from modal
  const handleAskQuestion = useCallback((question: string) => {
    if (isMobile) {
      setChatInitialQuestion(question);
      setIsMobileChatOpen(true);
    } else {
      setDesktopChatQuestion(question);
    }
    setSelectedOffense(null);
  }, [isMobile]);

  // Clear desktop question after it's processed
  const handleDesktopQuestionProcessed = useCallback(() => {
    setDesktopChatQuestion(undefined);
  }, []);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setSelectedOffense(null);
  }, []);

  // Handle close mobile chat
  const handleCloseMobileChat = useCallback(() => {
    setIsMobileChatOpen(false);
    setChatInitialQuestion(undefined);
  }, []);

  // Generate welcome message
  const welcomeMessage = generateWelcomeMessage(analysis);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Side-by-side layout on desktop */}
      <div className="flex gap-6">
        {/* Left side - Stats and Cards */}
        <div className={`${isMobile ? 'w-full' : 'w-[55%]'} space-y-6`}>
          {/* Stats Row with explanations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <p className="text-3xl font-bold text-[var(--color-primary)]">
                {analysis.summary.totalCodes}
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mt-1">Total</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">offenses reviewed</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <p className="text-3xl font-bold text-[var(--color-danger)]">
                {analysis.summary.mandatoryDisqualifiers}
              </p>
              <p className="text-sm font-medium text-[var(--color-danger)] mt-1">Disqualifying</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">cannot hire</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <p className="text-3xl font-bold text-[var(--color-warning)]">
                {analysis.summary.hasExemptionPath}
              </p>
              <p className="text-sm font-medium text-[var(--color-warning)] mt-1">Exemption</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">may be possible</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <p className="text-3xl font-bold text-[var(--color-success)]">
                {analysis.summary.nonDisqualifying}
              </p>
              <p className="text-sm font-medium text-[var(--color-success)] mt-1">Clear</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">not disqualifying</p>
            </div>
          </div>

          {/* Instruction Row */}
          <div className="flex items-center gap-2 p-3 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-[var(--radius-lg)]">
            <svg className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[var(--color-primary)]">
              <strong>Click any offense card</strong> below to see full details and recommended next steps.
            </p>
          </div>

          {/* Single flat grid of all offense cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {offenses.map((offense, index) => (
              <OffenseCard
                key={`offense-${index}`}
                offense={offense}
                onClick={() => handleCardClick(offense)}
              />
            ))}
          </div>
        </div>

        {/* Right side - Chat Panel (desktop only) */}
        {!isMobile && (
          <div className="w-[45%] sticky top-24 h-[calc(100vh-8rem)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
            <ChatPanel
              analysis={analysis}
              welcomeMessage={welcomeMessage}
              initialQuestion={desktopChatQuestion}
              onQuestionProcessed={handleDesktopQuestionProcessed}
            />
          </div>
        )}
      </div>

      {/* Mobile: Floating chat button */}
      {isMobile && !isMobileChatOpen && (
        <button
          onClick={() => setIsMobileChatOpen(true)}
          className={`
            fixed bottom-6 right-6 z-30
            w-14 h-14 rounded-full
            bg-[var(--color-primary)] text-white
            shadow-[var(--shadow-lg)]
            hover:bg-[var(--color-primary-hover)]
            hover:shadow-[var(--shadow-xl)]
            hover:scale-105
            active:scale-95
            transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
            flex items-center justify-center
          `}
          aria-label="Open chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Offense Detail Modal */}
      {selectedOffense && (
        <OffenseModal
          offense={selectedOffense.offense}
          aiAnalysis={selectedOffense.aiAnalysis}
          isOpen={true}
          onClose={handleCloseModal}
          onAskQuestion={handleAskQuestion}
          context={selectedOffense.context}
          disposition={selectedOffense.disposition}
        />
      )}

      {/* Mobile Chat Drawer */}
      {isMobile && (
        <ChatDrawer
          analysis={analysis}
          isOpen={isMobileChatOpen}
          onClose={handleCloseMobileChat}
          initialQuestion={chatInitialQuestion}
        />
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
        <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
          <strong className="text-[var(--color-text-secondary)]">Disclaimer:</strong> This tool provides informational guidance based on California Education Code sections 44830.1 and 45122.1. Results are not legal advice and should not be the sole basis for employment decisions. Always consult with legal counsel and follow your district's policies. Individual circumstances, rehabilitation evidence, and case-specific factors must be considered. The hiring authority retains final decision-making responsibility.
        </p>
      </div>
    </div>
  );
}
