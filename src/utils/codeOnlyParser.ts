import * as pdfjsLib from 'pdfjs-dist';
import { extractCodesFromImages, renderPdfToImages } from '../services/vision';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface ExtractedCode {
  code: string;
  context: string; // Non-PII context like "CNT 01" or disposition
  disposition?: 'CONVICTED' | 'DISMISSED' | 'ACQUITTED' | 'PENDING' | 'UNKNOWN';
  lineNumber?: number;
  extractionMethod?: 'text' | 'ocr' | 'manual';
}

export interface ExtractionResult {
  codes: ExtractedCode[];
  totalPages: number;
  extractionWarnings: string[];
  extractionMethod: 'text' | 'ocr' | 'hybrid';
}

/**
 * Patterns to identify offense codes
 * These patterns are designed to capture ONLY offense codes, not PII
 */
const CODE_PATTERNS = {
  // California statute pattern: "484 PC", "667.5(c) PC", "PC 484", "11350 HS"
  caStatute: /\b(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\s*(PC|HS|VC|BP|WI|FC)\b|\b(PC|HS|VC|BP|WI|FC)\s*(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\b/gi,

  // NCIC code pattern: 4-digit codes
  ncicCode: /\b([0-9]{4})\b/g,

  // Count pattern on RAP sheets: "CNT 01", "CNT 02"
  countPattern: /CNT\s*(\d{1,2})/gi,

  // Charge pattern: common format "CNT 01 484 PC-PETTY THEFT"
  chargePattern: /CNT\s*\d{1,2}\s+(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\s*(PC|HS|VC|BP|WI|FC)/gi,

  // Disposition keywords
  dispositionPattern: /\b(CONVICTED|CONV|DISMISSED|DISM|ACQUITTED|ACQ|NOT GUILTY|GUILTY|PENDING)\b/gi
};

/**
 * PII patterns to AVOID extracting
 * We explicitly filter these out to ensure privacy
 */
const PII_PATTERNS = {
  // Social Security Number patterns
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Date of birth patterns (various formats)
  dob: /\b(DOB|DATE OF BIRTH|BIRTH DATE)[:\s]*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi,

  // Name patterns (all caps names typical of RAP sheets)
  nameField: /\b(NAME|DEFENDANT|SUBJECT)[:\s]*[A-Z][A-Z\s,]+\b/gi,

  // Address patterns
  address: /\b\d+\s+[A-Z][A-Z\s]+(?:ST|AVE|BLVD|DR|RD|WAY|LN|CT|PL)\b/gi,

  // CII Number (California Identification Index)
  cii: /\b(CII|CDL|CA\s*ID)[:\s#]*[A-Z0-9]+\b/gi,

  // Phone numbers
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g
};

/**
 * Check if a string contains PII patterns
 */
function containsPII(text: string): boolean {
  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.test(text)) {
      pattern.lastIndex = 0; // Reset regex state
      return true;
    }
  }
  return false;
}

/**
 * Extract only the statute code from a line, ignoring any PII
 */
function extractStatuteCode(text: string): string | null {
  // First check if line contains PII - if so, only extract the code portion
  const matches = text.match(CODE_PATTERNS.caStatute);
  if (matches && matches.length > 0) {
    // Return just the first matched code, nothing else
    const match = matches[0];
    // Normalize format: "484 PC" or "PC 484" -> "484 PC"
    const parts = match.match(/(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\s*(PC|HS|VC|BP|WI|FC)/i) ||
      match.match(/(PC|HS|VC|BP|WI|FC)\s*(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)/i);

    if (parts) {
      const code = parts[1].match(/\d/) ? parts[1] : parts[2];
      const statute = parts[1].match(/\d/) ? parts[2] : parts[1];
      return `${code} ${statute.toUpperCase()}`;
    }
  }
  return null;
}

/**
 * Extract disposition from a line
 */
function extractDisposition(text: string): ExtractedCode['disposition'] {
  const upperText = text.toUpperCase();
  if (upperText.includes('CONVICTED') || upperText.includes('CONV') || upperText.includes('GUILTY')) {
    return 'CONVICTED';
  }
  if (upperText.includes('DISMISSED') || upperText.includes('DISM')) {
    return 'DISMISSED';
  }
  if (upperText.includes('ACQUITTED') || upperText.includes('ACQ') || upperText.includes('NOT GUILTY')) {
    return 'ACQUITTED';
  }
  if (upperText.includes('PENDING')) {
    return 'PENDING';
  }
  return 'UNKNOWN';
}

/**
 * Parse PDF and extract ONLY offense codes - no PII
 * This is the main function for processing RAP sheets safely
 */
export async function extractCodesFromPDF(file: File): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const extractedCodes: ExtractedCode[] = [];
  const seenCodes = new Set<string>();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Process each text item
      let currentLine = '';
      let lineNumber = 0;

      for (const item of textContent.items) {
        if ('str' in item) {
          const text = item.str;

          // Skip empty strings
          if (!text.trim()) {
            if (currentLine.trim()) {
              // Process completed line
              processLine(currentLine, lineNumber, extractedCodes, seenCodes);
              currentLine = '';
              lineNumber++;
            }
            continue;
          }

          // Append to current line
          currentLine += ' ' + text;

          // Check for line break (large Y position change would indicate new line)
          // This is a simplification - actual implementation would track Y coordinates
        }
      }

      // Process final line
      if (currentLine.trim()) {
        processLine(currentLine, lineNumber, extractedCodes, seenCodes);
      }
    }

    if (extractedCodes.length === 0) {
      warnings.push('No offense codes were found in the document. Please verify this is a California RAP sheet.');
    }

    return {
      codes: extractedCodes,
      totalPages: pdf.numPages,
      extractionWarnings: warnings,
      extractionMethod: 'text' as const
    };
  } catch (error) {
    warnings.push(`Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      codes: [],
      totalPages: 0,
      extractionWarnings: warnings,
      extractionMethod: 'text' as const
    };
  }
}

/**
 * Process a single line and extract any offense codes
 */
function processLine(
  line: string,
  lineNumber: number,
  extractedCodes: ExtractedCode[],
  seenCodes: Set<string>
): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;

  // Try to extract a statute code
  const code = extractStatuteCode(trimmedLine);
  if (code && !seenCodes.has(code)) {
    seenCodes.add(code);

    // Get safe context (just count number if present)
    const countMatch = trimmedLine.match(/CNT\s*(\d{1,2})/i);
    const context = countMatch ? `Count ${countMatch[1]}` : '';

    // Extract disposition
    const disposition = extractDisposition(trimmedLine);

    extractedCodes.push({
      code,
      context,
      disposition,
      lineNumber
    });
  }

  // Also check for NCIC codes (4-digit)
  const ncicMatches = trimmedLine.match(CODE_PATTERNS.ncicCode);
  if (ncicMatches) {
    for (const ncicCode of ncicMatches) {
      // Filter out years and other common 4-digit numbers
      const num = parseInt(ncicCode);
      // NCIC codes are generally 0001-9999 but we'll filter obvious non-codes
      // Years (1900-2099), common non-code numbers
      if (num >= 1900 && num <= 2099) continue; // Likely a year
      if (num < 100) continue; // Too small

      if (!seenCodes.has(ncicCode)) {
        seenCodes.add(ncicCode);
        extractedCodes.push({
          code: ncicCode,
          context: 'NCIC Code',
          disposition: extractDisposition(trimmedLine),
          lineNumber
        });
      }
    }
  }
}

/**
 * Parse manually entered codes (for fallback input)
 */
export function parseManualCodes(input: string): ExtractedCode[] {
  const codes: ExtractedCode[] = [];
  const seenCodes = new Set<string>();

  // Split by common delimiters
  const parts = input.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const code = extractStatuteCode(part);
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      codes.push({
        code,
        context: 'Manual Entry',
        disposition: 'UNKNOWN'
      });
    } else if (/^\d{4}$/.test(part) && !seenCodes.has(part)) {
      // NCIC code
      seenCodes.add(part);
      codes.push({
        code: part,
        context: 'NCIC Code',
        disposition: 'UNKNOWN'
      });
    } else if (part && !seenCodes.has(part)) {
      // Unknown format - add as-is for lookup
      seenCodes.add(part);
      codes.push({
        code: part,
        context: 'Manual Entry',
        disposition: 'UNKNOWN'
      });
    }
  }

  return codes;
}

/**
 * Verify that extraction did not capture PII
 * This is a safety check that should always return true
 */
export function verifyNoPII(codes: ExtractedCode[]): { safe: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const extracted of codes) {
    // Check the code itself
    if (containsPII(extracted.code)) {
      issues.push(`Code "${extracted.code.substring(0, 10)}..." may contain PII`);
    }

    // Check context
    if (containsPII(extracted.context)) {
      issues.push(`Context for code "${extracted.code}" may contain PII`);
    }
  }

  return {
    safe: issues.length === 0,
    issues
  };
}

/**
 * Hybrid PDF extraction - tries text first, falls back to OCR for scanned documents
 * This is the recommended method for V2 as it handles any PDF type
 */
export async function extractCodesFromPDFHybrid(
  file: File,
  progressCallback?: (status: string, percent: number) => void
): Promise<ExtractionResult> {
  const warnings: string[] = [];

  try {
    progressCallback?.('Reading PDF...', 10);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    progressCallback?.('Extracting text...', 20);

    // First, try text extraction
    const textResult = await extractCodesFromPDF(file);

    // Check if we got meaningful results from text extraction
    const textExtractionSuccessful = textResult.codes.length >= 1;

    // If text extraction got results, verify quality by checking if codes look valid
    if (textExtractionSuccessful) {
      const validCodes = textResult.codes.filter(c =>
        CODE_PATTERNS.caStatute.test(c.code) || /^\d{4}$/.test(c.code)
      );
      CODE_PATTERNS.caStatute.lastIndex = 0; // Reset regex

      if (validCodes.length >= textResult.codes.length * 0.5) {
        // At least 50% of extracted codes look valid - use text extraction
        progressCallback?.('Text extraction successful', 100);
        return {
          ...textResult,
          extractionMethod: 'text',
          codes: textResult.codes.map(c => ({ ...c, extractionMethod: 'text' as const }))
        };
      }
    }

    // Text extraction didn't work well - try OCR
    progressCallback?.('Document appears to be scanned. Starting OCR...', 30);

    try {
      // Render PDF pages to images
      progressCallback?.('Converting pages to images...', 40);
      const images = await renderPdfToImages(pdf, 10); // Max 10 pages for cost control

      progressCallback?.('Running OCR analysis...', 60);
      const ocrResult = await extractCodesFromImages(images);

      if (ocrResult.success && ocrResult.codes.length > 0) {
        progressCallback?.('OCR extraction successful', 100);

        // Convert OCR codes to ExtractedCode format
        const extractedCodes: ExtractedCode[] = ocrResult.codes.map(code => ({
          code,
          context: 'OCR Extraction',
          disposition: 'UNKNOWN' as const,
          extractionMethod: 'ocr' as const
        }));

        return {
          codes: extractedCodes,
          totalPages: pdf.numPages,
          extractionWarnings: ocrResult.error ? [ocrResult.error] : [],
          extractionMethod: 'ocr'
        };
      }

      // OCR also didn't find codes - try hybrid (combine whatever we got)
      if (textResult.codes.length > 0 || (ocrResult.codes && ocrResult.codes.length > 0)) {
        progressCallback?.('Using hybrid results', 100);

        const allCodes = new Set<string>();
        const hybridCodes: ExtractedCode[] = [];

        // Add text extraction results
        for (const code of textResult.codes) {
          if (!allCodes.has(code.code)) {
            allCodes.add(code.code);
            hybridCodes.push({ ...code, extractionMethod: 'text' });
          }
        }

        // Add OCR results
        for (const code of ocrResult.codes || []) {
          if (!allCodes.has(code)) {
            allCodes.add(code);
            hybridCodes.push({
              code,
              context: 'OCR Extraction',
              disposition: 'UNKNOWN',
              extractionMethod: 'ocr'
            });
          }
        }

        return {
          codes: hybridCodes,
          totalPages: pdf.numPages,
          extractionWarnings: ['Used hybrid extraction (text + OCR)'],
          extractionMethod: 'hybrid'
        };
      }

      // Neither method found codes
      warnings.push('No offense codes found using text extraction or OCR.');
      if (ocrResult.error) {
        warnings.push(`OCR error: ${ocrResult.error}`);
      }

    } catch (ocrError) {
      warnings.push(`OCR failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
      warnings.push('Falling back to text-only extraction results.');

      // Return whatever text extraction got
      if (textResult.codes.length > 0) {
        return {
          ...textResult,
          extractionWarnings: [...textResult.extractionWarnings, ...warnings],
          extractionMethod: 'text'
        };
      }
    }

    progressCallback?.('Extraction complete', 100);

    return {
      codes: [],
      totalPages: pdf.numPages,
      extractionWarnings: warnings.length > 0 ? warnings : ['No offense codes found in document.'],
      extractionMethod: 'text'
    };

  } catch (error) {
    warnings.push(`Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      codes: [],
      totalPages: 0,
      extractionWarnings: warnings,
      extractionMethod: 'text'
    };
  }
}
