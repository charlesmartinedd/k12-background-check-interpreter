import { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { extractCodesFromPDF, verifyNoPII } from '../utils/codeOnlyParser';
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
        // Process PDF
        const result = await extractCodesFromPDF(file);

        // Verify no PII was extracted (safety check)
        const piiCheck = verifyNoPII(result.codes);
        if (!piiCheck.safe) {
          console.warn('PII detection warning:', piiCheck.issues);
        }

        if (result.extractionWarnings.length > 0) {
          result.extractionWarnings.forEach(warning => {
            console.warn('Extraction warning:', warning);
          });
        }

        extractedCodes = result.codes;
      } else {
        // Process image file using Vision OCR
        const base64 = await fileToBase64(file);
        const mimeType = fileType || 'image/jpeg';

        const result = await extractCodesFromImage(base64, mimeType);

        if (result.success && result.codes.length > 0) {
          extractedCodes = result.codes.map(code => ({
            code,
            context: 'Image OCR',
            disposition: 'UNKNOWN' as const,
            extractionMethod: 'ocr' as const,
          }));
        }

        if (result.error) {
          console.warn('Image extraction warning:', result.error);
        }
      }

      if (extractedCodes.length === 0) {
        onError('No offense codes found in the document. Please verify this is a valid background check document, or enter codes manually.');
      } else {
        onCodesExtracted(extractedCodes);
      }
    } catch (err) {
      onError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert file to base64 for Vision API
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
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

  return (
    <Card variant="elevated" padding="lg" className="bg-[var(--color-surface)] border border-[var(--color-border)]">
      <CardHeader>
        <CardTitle>Upload Background Check Document</CardTitle>
        <CardDescription>
          Upload a PDF or photo of a background check document to automatically extract offense codes.
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
                Drag and drop a file here, or
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
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <p className="text-caption mt-4">
                PDF or image files (JPEG, PNG, HEIC, TIFF). Photos of documents work too.
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
              <strong>Privacy Protected:</strong> This tool extracts ONLY offense codes from your document.
              No names, dates of birth, addresses, or other identifying information is processed or stored.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
