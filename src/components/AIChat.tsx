import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { streamChat, type ComprehensiveAnalysis } from '../services/analysis';
import { sanitizeInput } from '../services/openai';
import type { ChatMessage } from '../types/legal';

interface AIChatProps {
  analysis: ComprehensiveAnalysis;
}

export function AIChat({ analysis }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [privacyWarning, setPrivacyWarning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll within chat container only (NEVER scroll the page)
  useEffect(() => {
    // Use scrollTop on the container instead of scrollIntoView to avoid page scroll
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
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
        content: 'I apologize, but I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, analysis]);

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Suggested questions based on analysis
  const suggestedQuestions = [
    'What exemption options are available for these offenses?',
    'Explain the Certificate of Rehabilitation process.',
    'What factors should I consider in the individualized assessment?',
    'Are there any recent law changes that affect this analysis?',
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Ask Questions
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Get answers about the background check analysis
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-8">
            <div className="text-[var(--color-text-secondary)] mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p>Ask me anything about this background check</p>
            </div>

            {/* Suggested questions */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 text-xs bg-[var(--color-surface)] hover:bg-[var(--color-background)]
                    border border-[var(--color-border-light)] rounded-full
                    text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                    transition-colors duration-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-white/70' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--color-surface)] text-[var(--color-text-primary)]">
              <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--color-surface)]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-200" />
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Privacy Warning */}
      {privacyWarning && (
        <div className="mx-4 mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <span className="font-medium">Privacy Notice:</span> {privacyWarning}
        </div>
      )}

      {/* Input */}
      <div className="pt-4 border-t border-[var(--color-border-light)]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about exemptions, legal requirements, or HR guidance..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 px-4 py-3 border border-[var(--color-border)]
              rounded-xl resize-none
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-secondary)]
              bg-[var(--color-background)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-shadow duration-200"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '48px';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="self-end"
          >
            {isStreaming ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </Button>
        </form>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center">
          AI responses are informational only and do not constitute legal advice.
          Always consult a qualified attorney for hiring decisions.
        </p>
      </div>

      {/* Guardrail Disclaimer */}
      <div className="mt-4 px-4 py-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border-light)]">
        <p className="text-xs text-[var(--color-text-secondary)]">
          <span className="font-medium">About this assistant:</span> I provide information about California K-12 background check rules.
          I do not store personal information, provide legal advice, or make hiring recommendations.
          For complex cases, please consult an employment attorney.
        </p>
      </div>
    </Card>
  );
}
