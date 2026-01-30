import { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { parseManualCodes, extractCodesFromPDF, verifyNoPII, extractCodesFromPDFHybrid, isValidCaliforniaCode } from '../utils/codeOnlyParser';
import { extractCodesFromImage } from '../services/vision';
import type { ExtractedCode } from '../utils/codeOnlyParser';

// Supported file types
const SUPPORTED_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/png': 'PNG',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/tiff': 'TIFF',
  'image/webp': 'WebP',
};

const SUPPORTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.tiff,.tif,.webp';

interface LandingPageV2Props {
  onCodesSubmit: (codes: ExtractedCode[]) => void;
  onError: (error: string) => void;
}

type InputMode = 'upload' | 'manual';

export function LandingPageV2({ onCodesSubmit, onError }: LandingPageV2Props) {
  const [activeMode, setActiveMode] = useState<InputMode>('upload');
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File processing logic
  const processFile = async (file: File) => {
    const fileType = file.type || '';
    const isSupported = fileType in SUPPORTED_TYPES ||
      SUPPORTED_EXTENSIONS.split(',').some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isSupported) {
      onError('Please upload a PDF or image file (JPEG, PNG, HEIC, TIFF, WebP)');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      let extractedCodes: ExtractedCode[] = [];

      if (fileType === 'application/pdf') {
        // Use hybrid extraction with document validation
        const result = await extractCodesFromPDFHybrid(file, (status, _percent) => {
          setFileName(`${file.name} - ${status}`);
        });

        // Check if document validation failed
        if (result.documentValidation && !result.documentValidation.isValid) {
          onError(result.documentValidation.reason || "This doesn't appear to be a California background check document. Please upload a RAP sheet or criminal history report.");
          return;
        }

        const piiCheck = verifyNoPII(result.codes);
        if (!piiCheck.safe) {
          console.warn('PII detection warning:', piiCheck.issues);
        }
        extractedCodes = result.codes;

        // Show warning if low confidence
        if (result.extractionWarnings.some(w => w.includes('Low confidence'))) {
          console.warn('Extraction warnings:', result.extractionWarnings);
        }
      } else {
        const base64 = await fileToBase64(file);
        const mimeType = fileType || 'image/jpeg';
        const result = await extractCodesFromImage(base64, mimeType);

        // Check if document validation failed (OCR also validates now)
        if (result.isBackgroundCheck === false) {
          onError(result.error || "This doesn't appear to be a California background check document. Please upload a RAP sheet or criminal history report.");
          return;
        }

        if (result.success && result.codes.length > 0) {
          // STRICT VALIDATION: Only accept codes matching California statute format
          const validCodes = result.codes.filter(code => isValidCaliforniaCode(code));
          extractedCodes = validCodes.map(code => ({
            code,
            context: 'Image OCR',
            disposition: 'UNKNOWN' as const,
            extractionMethod: 'ocr' as const,
          }));
        }
      }

      if (extractedCodes.length === 0) {
        onError('No valid California statute codes found. Codes must be in format like "484 PC" or "11350 HS".');
      } else {
        onCodesSubmit(extractedCodes);
      }
    } catch (err) {
      onError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setFileName(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  // Manual entry logic
  const handleManualSubmit = () => {
    setManualError(null);

    if (!manualInput.trim()) {
      setManualError('Please enter at least one offense code');
      return;
    }

    const codes = parseManualCodes(manualInput);
    if (codes.length === 0) {
      setManualError('No valid codes found. Try "484 PC" or "11350 HS"');
      return;
    }

    onCodesSubmit(codes);
  };

  return (
    <Card className="bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      {/* Professional Header */}
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-text-secondary)] bg-opacity-10 text-[var(--color-text-secondary)] flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-text-primary)] text-base">
              Background Check Assistant
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Analyze offense codes under California Education Code
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Input Panels */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Upload Panel - Professional styling */}
          <div
            onClick={() => setActiveMode('upload')}
            className={`
              relative rounded-lg border cursor-pointer transition-all duration-200
              ${activeMode === 'upload'
                ? 'border-[var(--color-text-primary)] border-opacity-30 bg-[var(--color-background)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)] hover:border-opacity-40'
              }
            `}
          >
            {/* Active indicator - subtle checkmark */}
            {activeMode === 'upload' && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
                setActiveMode('upload');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className="p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Upload Document</span>
              </div>

              {isProcessing ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-[var(--color-text-secondary)] border-t-transparent rounded-full" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Processing {fileName}...</span>
                </div>
              ) : (
                <>
                  <div className={`
                    border border-dashed rounded-lg p-4 text-center transition-colors
                    ${isDragging
                      ? 'border-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)]'
                      : 'border-[var(--color-border)]'
                    }
                  `}>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                      Drop file here or
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_EXTENSIONS}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-2 text-center">
                    PDF, JPEG, PNG, HEIC
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Manual Entry Panel - Professional styling */}
          <div
            onClick={() => setActiveMode('manual')}
            className={`
              relative rounded-lg border cursor-pointer transition-all duration-200
              ${activeMode === 'manual'
                ? 'border-[var(--color-text-primary)] border-opacity-30 bg-[var(--color-background)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)] hover:border-opacity-40'
              }
            `}
          >
            {/* Active indicator - subtle checkmark */}
            {activeMode === 'manual' && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Enter Manually</span>
              </div>

              <textarea
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  setManualError(null);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="484 PC, 11350 HS, 23152 VC"
                className={`
                  w-full px-3 py-2 text-sm
                  bg-[var(--color-background)]
                  border rounded-lg
                  text-[var(--color-text-primary)]
                  placeholder:text-[var(--color-text-tertiary)]
                  focus:outline-none focus:ring-1 focus:ring-[var(--color-text-secondary)] focus:ring-opacity-50 focus:border-[var(--color-text-secondary)]
                  transition-all duration-200
                  resize-none
                  ${manualError ? 'border-[var(--color-alert)]' : 'border-[var(--color-border)]'}
                `}
                rows={3}
              />
              {manualError && (
                <p className="text-xs text-[var(--color-alert)] mt-1">{manualError}</p>
              )}
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Separate with commas or new lines
              </p>
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="mt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={activeMode === 'manual' ? handleManualSubmit : () => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : activeMode === 'manual' ? 'Analyze Codes' : 'Upload & Analyze'}
          </Button>
        </div>
      </div>

      {/* Condensed Privacy Footer - Subdued professional styling */}
      <div className="px-5 py-3 bg-[var(--color-background)] border-t border-[var(--color-border)]">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Privacy-first: Only codes processed
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Flags disqualifiers under CA Ed Code
          </span>
        </div>
      </div>
    </Card>
  );
}
