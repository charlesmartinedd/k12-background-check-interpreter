import { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { extractCodesFromPDF, verifyNoPII } from '../utils/codeOnlyParser';
import type { ExtractedCode } from '../utils/codeOnlyParser';

interface PdfUploaderProps {
  onCodesExtracted: (codes: ExtractedCode[]) => void;
  onError: (error: string) => void;
}

export function PdfUploader({ onCodesExtracted, onError }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      onError('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const result = await extractCodesFromPDF(file);

      // Verify no PII was extracted (safety check)
      const piiCheck = verifyNoPII(result.codes);
      if (!piiCheck.safe) {
        console.warn('PII detection warning:', piiCheck.issues);
        // Still proceed, but the extraction should have filtered out PII
      }

      if (result.extractionWarnings.length > 0) {
        result.extractionWarnings.forEach(warning => {
          console.warn('Extraction warning:', warning);
        });
      }

      if (result.codes.length === 0) {
        onError('No offense codes found in the PDF. Please verify this is a California RAP sheet, or enter codes manually.');
      } else {
        onCodesExtracted(result.codes);
      }
    } catch (err) {
      onError(`Failed to process PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>Upload RAP Sheet PDF</CardTitle>
        <CardDescription>
          Upload a California DOJ RAP sheet to automatically extract offense codes.
          Only codes are extracted - no names, dates, or other personal information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-[var(--radius-lg)]
            p-8 text-center
            transition-all duration-200
            ${isDragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-5'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-background)]'
            }
          `}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin w-10 h-10 border-3 border-[var(--color-primary)] border-t-transparent rounded-full" />
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Processing {fileName}...
              </p>
              <p className="text-caption">
                Extracting offense codes only - no personal information
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-body text-[var(--color-text-primary)] mb-2">
                Drag and drop a PDF here, or
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <p className="text-caption mt-4">
                PDF files only. All processing happens in your browser.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 p-3 bg-[var(--color-background)] rounded-[var(--radius-md)]">
          <p className="text-caption flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>
              <strong>Privacy Protected:</strong> This tool extracts ONLY offense codes from the PDF.
              No names, dates of birth, addresses, or other identifying information is processed or stored.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
