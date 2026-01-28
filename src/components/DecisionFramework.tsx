import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { getRelevantQuestions } from '../utils/disqualificationCheck';
import type { DecisionFrameworkQuestion } from '../utils/disqualificationCheck';
import type { DisqualificationStatus } from '../utils/codeLookup';

interface DecisionFrameworkProps {
  status: DisqualificationStatus;
}

export function DecisionFramework({ status }: DecisionFrameworkProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const relevantQuestions = getRelevantQuestions(status);

  if (relevantQuestions.length === 0) {
    return null;
  }

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>Decision Framework</CardTitle>
        <CardDescription>
          Consider these questions when making an individualized assessment.
          Click each question to see guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {relevantQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index + 1}
              isExpanded={expandedQuestions.has(question.id)}
              onToggle={() => toggleQuestion(question.id)}
            />
          ))}
        </div>

        <div className="mt-6 p-4 bg-[var(--color-background)] rounded-[var(--radius-md)]">
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
            Fair Hiring Reminder
          </h4>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            The California Fair Chance Act requires employers to conduct an
            individualized assessment before making adverse employment decisions
            based on criminal history. Consider the nature and gravity of the
            offense, the time elapsed, and the nature of the job duties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuestionCardProps {
  question: DecisionFrameworkQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function QuestionCard({ question, index, isExpanded, onToggle }: QuestionCardProps) {
  return (
    <div
      className={`
        border rounded-[var(--radius-md)] overflow-hidden
        transition-all duration-200
        ${isExpanded
          ? 'border-[var(--color-primary)] shadow-[var(--shadow-sm)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }
      `}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--color-background)] transition-colors"
      >
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] font-semibold text-sm">
          {index}
        </span>
        <span className="flex-1 font-medium text-[var(--color-text-primary)]">
          {question.question}
        </span>
        <svg
          className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="pl-11 border-l-2 border-[var(--color-primary)] border-opacity-20 ml-4">
            <p className="text-body-sm text-[var(--color-text-secondary)] pl-4">
              {question.guidance}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
