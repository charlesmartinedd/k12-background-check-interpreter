import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { parseManualCodes } from '../utils/codeOnlyParser';
import type { ExtractedCode } from '../utils/codeOnlyParser';

interface CodeEntryProps {
  onCodesSubmit: (codes: ExtractedCode[]) => void;
}

export function CodeEntry({ onCodesSubmit }: CodeEntryProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('Please enter at least one offense code');
      return;
    }

    const codes = parseManualCodes(input);
    if (codes.length === 0) {
      setError('No valid offense codes found. Try formats like "484 PC" or "11350 HS"');
      return;
    }

    onCodesSubmit(codes);
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>Enter Offense Codes</CardTitle>
        <CardDescription>
          Manually enter offense codes to analyze. This does not store any data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="codes"
              className="block text-body-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              Offense Codes
            </label>
            <textarea
              id="codes"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter offense codes separated by commas or new lines&#10;Example: 484 PC, 11350 HS, 23152 VC"
              className={`
                w-full px-4 py-3
                bg-[var(--color-background)]
                border rounded-[var(--radius-md)]
                text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-tertiary)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
                transition-all duration-200
                resize-none
                ${error ? 'border-[var(--color-alert)]' : 'border-[var(--color-border)]'}
              `}
              rows={4}
            />
            {error && (
              <p className="mt-2 text-sm text-[var(--color-alert)]">{error}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-caption">
              Supported formats: California Penal Codes (e.g., 484 PC), Health & Safety Codes (e.g., 11350 HS), Vehicle Codes (e.g., 23152 VC), and NCIC codes (4-digit numbers)
            </p>
            <Button type="submit" size="lg" className="w-full">
              Analyze Codes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
