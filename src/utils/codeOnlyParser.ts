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
  documentValidation?: DocumentValidation;
}

export interface DocumentValidation {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  indicators: string[];
  reason?: string;
}

/**
 * Background check document indicators - STRICT validation
 * Requires at least one strong indicator to be considered valid
 */
const DOCUMENT_INDICATORS = {
  // Strong indicators - presence of one is sufficient
  strong: [
    /\bRAP\s*SHEET\b/i,
    /\bCRIMINAL\s*HISTORY\b/i,
    /\bARREST\s*RECORD\b/i,
    /\bCRIMINAL\s*RECORD\b/i,
    /\bDEPARTMENT\s*OF\s*JUSTICE\b/i,
    /\bDOJ\b/i,
    /\bFBI\b/i,
    /\bLIVESCAN\b/i,
    /\bRAPBACK\b/i,
    /\bCII\s*#?\d+/i, // California Identification Index
  ],
  // Medium indicators - need multiple
  medium: [
    /\bARREST\b/i,
    /\bCONVICTION\b/i,
    /\bCHARGE[DS]?\b/i,
    /\bCNT\s*\d+/i, // Count numbers on RAP sheets
    /\bDISP(?:OSITION)?\b/i,
    /\bCOURT\b/i,
    /\bFELONY\b/i,
    /\bMISDEMEANOR\b/i,
    /\bCASE\s*#?\d+/i,
    /\bBOOKING\b/i,
  ],
  // Statute patterns themselves indicate background check context
  statutes: [
    /\b\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*\s*(?:PC|HS|VC|BP|WI|FC)\b/i,
    /\b(?:PC|HS|VC|BP|WI|FC)\s*\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*/i,
  ],
};

/**
 * Validate if a document appears to be a California background check
 * BALANCED mode: Accepts documents with statutes OR criminal justice indicators
 */
export function validateBackgroundCheckDocument(text: string): DocumentValidation {
  const foundIndicators: string[] = [];
  let strongCount = 0;
  let mediumCount = 0;
  let statuteCount = 0;

  // Check strong indicators
  for (const pattern of DOCUMENT_INDICATORS.strong) {
    const match = text.match(pattern);
    if (match) {
      strongCount++;
      foundIndicators.push(match[0].trim());
    }
  }

  // Check medium indicators
  for (const pattern of DOCUMENT_INDICATORS.medium) {
    const match = text.match(pattern);
    if (match) {
      mediumCount++;
      foundIndicators.push(match[0].trim());
    }
  }

  // Check for statute patterns
  for (const pattern of DOCUMENT_INDICATORS.statutes) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      statuteCount += matches.length;
    }
  }

  // BALANCED validation - accept if any of these conditions are met:

  // High confidence: Strong indicator present
  if (strongCount >= 1) {
    return {
      isValid: true,
      confidence: 'high',
      indicators: foundIndicators.slice(0, 5),
    };
  }

  // Medium confidence: Has California statute codes (the main thing we're looking for)
  if (statuteCount >= 1) {
    return {
      isValid: true,
      confidence: 'medium',
      indicators: [`${statuteCount} statute code(s) found`, ...foundIndicators.slice(0, 3)],
    };
  }

  // Low confidence: Has some criminal justice context
  if (mediumCount >= 2) {
    return {
      isValid: true,
      confidence: 'low',
      indicators: foundIndicators.slice(0, 5),
    };
  }

  // No evidence of background check content - reject
  // This catches spreadsheets, invoices, random documents
  return {
    isValid: false,
    confidence: 'none',
    indicators: foundIndicators,
    reason: "This doesn't appear to be a California background check document. Please upload a RAP sheet or criminal history report.",
  };
}

/**
 * Patterns to identify offense codes
 * These patterns are designed to capture ONLY offense codes, not PII
 */
const CODE_PATTERNS = {
  // California statute pattern: "484 PC", "667.5(c) PC", "PC 484", "11350 HS"
  caStatute: /\b(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\s*(PC|HS|VC|BP|WI|FC)\b|\b(PC|HS|VC|BP|WI|FC)\s*(\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*)\b/gi,

  // Count pattern on RAP sheets: "CNT 01", "CNT 02"
  countPattern: /CNT\s*(\d{1,2})/gi,

  // Disposition keywords
  dispositionPattern: /\b(CONVICTED|CONV|DISMISSED|DISM|ACQUITTED|ACQ|NOT GUILTY|GUILTY|PENDING)\b/gi,
};

/**
 * STRICT CODE VALIDATION
 * Only returns true for codes that match valid California statute format
 * This ensures we NEVER show random numbers to users
 */
const VALID_CODE_PATTERN = /^\d{2,5}(?:\.\d+)?(?:\([a-z0-9]+\))*\s*(PC|HS|VC|BP|WI|FC)$/i;

export function isValidCaliforniaCode(code: string): boolean {
  return VALID_CODE_PATTERN.test(code.trim());
}

/**
 * Filter extracted codes to only include valid California statutes
 * This is the final gate before showing codes to users
 */
export function filterToValidCodes(codes: ExtractedCode[]): ExtractedCode[] {
  return codes.filter(c => isValidCaliforniaCode(c.code));
}


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
 * Includes document validation to reject non-background check documents
 */
export async function extractCodesFromPDF(file: File): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const extractedCodes: ExtractedCode[] = [];
  const seenCodes = new Set<string>();
  let fullText = '';

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
          fullText += ' ' + text; // Accumulate for validation

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
        }
      }

      // Process final line
      if (currentLine.trim()) {
        processLine(currentLine, lineNumber, extractedCodes, seenCodes);
      }
    }

    // Validate document type BEFORE returning results
    const validation = validateBackgroundCheckDocument(fullText);

    if (!validation.isValid) {
      return {
        codes: [],
        totalPages: pdf.numPages,
        extractionWarnings: [validation.reason || "This doesn't appear to be a background check document."],
        extractionMethod: 'text' as const,
        documentValidation: validation
      };
    }

    // STRICT VALIDATION: Only return codes that match valid California statute format
    // This ensures we NEVER show random numbers, years, or other false positives to users
    const validatedCodes = filterToValidCodes(extractedCodes);

    if (validatedCodes.length === 0) {
      warnings.push('No valid California statute codes found. Codes must be in format like "484 PC" or "11350 HS".');
    }

    return {
      codes: validatedCodes,
      totalPages: pdf.numPages,
      extractionWarnings: warnings,
      extractionMethod: 'text' as const,
      documentValidation: validation
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

  // NOTE: We no longer extract standalone NCIC codes (4-digit numbers)
  // Only valid California statute codes (e.g., "484 PC", "11350 HS") are returned
  // This prevents false positives from random numbers in documents
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
 * Includes document validation to reject non-background check documents
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

    // First, try text extraction (includes document validation)
    const textResult = await extractCodesFromPDF(file);

    // If document validation failed, return immediately with the validation error
    if (textResult.documentValidation && !textResult.documentValidation.isValid) {
      progressCallback?.('Document validation failed', 100);
      return textResult;
    }

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
