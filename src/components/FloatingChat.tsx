import { useState, useCallback } from 'react';
import { ChatDrawer } from './ChatDrawer';
import type { ComprehensiveAnalysis } from '../services/analysis';

interface FloatingChatProps {
  analysis: ComprehensiveAnalysis;
}

export function FloatingChat({ analysis }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setInitialQuestion(undefined);
  }, []);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpen}
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
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
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

      {/* Chat Drawer */}
      <ChatDrawer
        analysis={analysis}
        isOpen={isOpen}
        onClose={handleClose}
        initialQuestion={initialQuestion}
      />
    </>
  );
}
