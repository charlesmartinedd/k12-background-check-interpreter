import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { streamChat, type ComprehensiveAnalysis } from '../services/analysis';
import { sanitizeInput } from '../services/openai';
import type { ChatMessage } from '../types/legal';

interface ChatPanelProps {
  analysis: ComprehensiveAnalysis;
  welcomeMessage: string;
  initialQuestion?: string;
  onQuestionProcessed?: () => void;
}

export function ChatPanel({ analysis, welcomeMessage, initialQuestion, onQuestionProcessed }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [privacyWarning, setPrivacyWarning] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update welcome message if it changes
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  }, [welcomeMessage]);

  // No auto-scroll - let users scroll manually to read at their own pace

  // Auto-submit initial question when provided
  useEffect(() => {
    if (initialQuestion && !isStreaming) {
      // Directly submit the question
      handleSubmitDirect(initialQuestion);
      onQuestionProcessed?.();
    }
  }, [initialQuestion]);

  // Direct submit function for auto-submitting questions
  const handleSubmitDirect = useCallback(
    async (questionText: string) => {
      if (!questionText.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: questionText.trim(),
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsStreaming(true);
      setStreamingContent('');

      try {
        let fullContent = '';
        const stream = streamChat(updatedMessages, analysis);

        for await (const chunk of stream) {
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };

        setMessages([...updatedMessages, assistantMessage]);
        setStreamingContent('');
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your question. Please try again.',
          timestamp: new Date(),
        };
        setMessages([...updatedMessages, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, analysis]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput || isStreaming) return;

      // Sanitize input for privacy protection
      const { sanitized, warnings } = sanitizeInput(trimmedInput);

      // Show privacy warning if PII was detected
      if (warnings.length > 0) {
        setPrivacyWarning(warnings.join(' '));
        setTimeout(() => setPrivacyWarning(null), 5000);
      }

      // Add user message (using sanitized content)
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: sanitized,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsStreaming(true);
      setStreamingContent('');

      try {
        // Stream the response
        let fullContent = '';
        const stream = streamChat(updatedMessages, analysis);

        for await (const chunk of stream) {
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };

        setMessages([...updatedMessages, assistantMessage]);
        setStreamingContent('');
      } catch (error) {
        console.error('Chat error:', error);

        // Add error message
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'I apologize, but I encountered an error processing your question. Please try again.',
          timestamp: new Date(),
        };

        setMessages([...updatedMessages, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, messages, analysis]
  );

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Quick question chips - relevant to analysis
  const quickQuestions = ['What do these results mean?', 'Exemption process?', 'What should I do next?'];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <svg
          className="w-5 h-5 text-[var(--color-primary)]"
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
        <span className="font-medium text-[var(--color-text-primary)]">Assistant</span>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-3 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] rounded-bl-md border border-[var(--color-border)]'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[90%] px-3 py-2 rounded-2xl rounded-bl-md bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce"
                  style={{ animationDelay: '100ms' }}
                />
                <span
                  className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce"
                  style={{ animationDelay: '200ms' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length === 1 && !isStreaming && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuestion(q)}
              className="px-3 py-1 text-xs bg-[var(--color-surface-elevated)] hover:bg-[var(--color-background)] border border-[var(--color-border)] rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Privacy Warning */}
      {privacyWarning && (
        <div className="mx-4 mb-2 p-2 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-warning)]">
          <span className="font-medium">Privacy:</span> {privacyWarning}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this analysis..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 px-3 py-2 border border-[var(--color-border)]
              rounded-full resize-none
              text-sm text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              bg-[var(--color-background)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-shadow duration-200"
            style={{ minHeight: '40px', maxHeight: '80px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '40px';
              target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isStreaming}
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
          >
            {isStreaming ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            )}
          </Button>
        </form>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 text-center">
          AI responses are informational only
        </p>
      </div>
    </div>
  );
}

// Helper to generate welcome message - instructional for HR administrators
export function generateWelcomeMessage(analysis: ComprehensiveAnalysis): string {
  const { mandatoryDisqualifiers, hasExemptionPath, nonDisqualifying, totalCodes } =
    analysis.summary;

  let message = `I've analyzed ${totalCodes} offense${totalCodes !== 1 ? 's' : ''} from this background check.\n\n`;

  // Provide specific guidance based on what was found
  if (mandatoryDisqualifiers > 0) {
    message += `${mandatoryDisqualifiers} offense${mandatoryDisqualifiers !== 1 ? 's' : ''} ${mandatoryDisqualifiers !== 1 ? 'are' : 'is'} a mandatory disqualifier under California Education Code. These block hiring regardless of circumstances.\n\n`;
  }

  if (hasExemptionPath > 0) {
    message += `${hasExemptionPath} offense${hasExemptionPath !== 1 ? 's' : ''} may qualify for an exemption. The candidate would need to provide documentation such as a Certificate of Rehabilitation or court finding.\n\n`;
  }

  if (nonDisqualifying > 0) {
    message += `${nonDisqualifying} offense${nonDisqualifying !== 1 ? 's' : ''} ${nonDisqualifying !== 1 ? 'are' : 'is'} not listed as disqualifying under California Education Code.\n\n`;
  }

  // Add next steps and how to use
  message += `Click any offense card on the left for details. Type a question below to ask about exemptions, timelines, or documentation requirements.`;

  return message;
}
