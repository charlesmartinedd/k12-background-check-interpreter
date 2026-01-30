// OpenAI Vision API Service for OCR PDF Extraction

import OpenAI from 'openai';
import { config } from '../config/env';

// Initialize OpenAI client (reuse from openai.ts pattern)
let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return openaiClient;
}

// OCR extraction prompt - balanced approach
const OCR_EXTRACTION_PROMPT = `You are analyzing a document to extract California offense codes. Be thorough in finding all codes.

STEP 1: QUICK DOCUMENT CHECK
Only reject if this is CLEARLY not a legal/criminal document (e.g., a spreadsheet with random numbers, an invoice, a receipt with prices, or unrelated business document).

If clearly NOT a criminal/legal document, return:
{
  "isBackgroundCheck": false,
  "codes": [],
  "reason": "This does not appear to be a California background check document"
}

Otherwise, proceed to extract codes - when in doubt, extract codes and let the user decide.

STEP 2: CODE EXTRACTION
IMPORTANT PRIVACY REQUIREMENTS:
- Extract ONLY offense codes (e.g., "484 PC", "11377 HS", "23152 VC", "211 PC")
- Do NOT extract names, dates of birth, addresses, Social Security numbers, CII numbers, or any other personal information

Look for offense codes in these formats:
- California Penal Code: "484 PC", "187(a) PC", "211 PC", "PC 484"
- Health & Safety Code: "11377 HS", "11350(a) HS", "HS 11377"
- Vehicle Code: "23152(a) VC", "14601.1 VC", "VC 23152"
- Business & Professions: "25658 BP", "BP 25658"
- Welfare & Institutions: "602 WI", "WI 602"
- Family Code: "273.5 FC", "FC 273.5"
- NCIC codes: 4-digit codes if labeled "NCIC" or appearing with charges
- Charge counts: "CNT 01 484 PC-PETTY THEFT"

Return format:
{
  "isBackgroundCheck": true,
  "codes": ["484 PC", "211 PC", "23152(a) VC", "11377 HS"]
}

If no codes found:
{
  "isBackgroundCheck": true,
  "codes": [],
  "error": "No offense codes found in document"
}`;

export interface VisionExtractionResult {
  success: boolean;
  codes: string[];
  error?: string;
  isBackgroundCheck?: boolean;
}

// Convert PDF page to base64 image (called from hybrid extractor)
export async function extractCodesFromImage(
  base64Image: string,
  mimeType: string = 'image/png'
): Promise<VisionExtractionResult> {
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // Vision model
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high', // High detail for document OCR
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        codes: [],
        error: 'No response from Vision API',
      };
    }

    const parsed = JSON.parse(content);

    // Check if document validation failed
    if (parsed.isBackgroundCheck === false) {
      return {
        success: false,
        codes: [],
        error: parsed.reason || "This doesn't appear to be a California background check document.",
        isBackgroundCheck: false,
      };
    }

    return {
      success: true,
      codes: parsed.codes || [],
      error: parsed.error,
      isBackgroundCheck: parsed.isBackgroundCheck ?? true,
    };
  } catch (error) {
    console.error('Vision API extraction error:', error);
    return {
      success: false,
      codes: [],
      error: error instanceof Error ? error.message : 'Vision API error',
    };
  }
}

// Extract codes from multiple images (multi-page PDF)
export async function extractCodesFromImages(
  images: Array<{ base64: string; mimeType: string }>
): Promise<VisionExtractionResult> {
  const allCodes: string[] = [];
  const errors: string[] = [];

  // Process images in parallel (up to 5 at a time to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(img => extractCodesFromImage(img.base64, img.mimeType))
    );

    for (const result of results) {
      if (result.success) {
        allCodes.push(...result.codes);
      } else if (result.error) {
        errors.push(result.error);
      }
    }
  }

  // Deduplicate codes
  const uniqueCodes = [...new Set(allCodes)];

  return {
    success: uniqueCodes.length > 0 || errors.length === 0,
    codes: uniqueCodes,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

// Render PDF page to image using canvas (browser environment)
export async function renderPdfPageToImage(
  pdfDocument: any, // PDFDocumentProxy from pdf.js
  pageNumber: number,
  scale: number = 2.0 // Higher scale for better OCR quality
): Promise<{ base64: string; mimeType: string }> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  // Convert to base64 PNG
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  // Clean up
  canvas.remove();

  return {
    base64,
    mimeType: 'image/png',
  };
}

// Render all PDF pages to images
export async function renderPdfToImages(
  pdfDocument: any,
  maxPages: number = 20 // Limit for cost control
): Promise<Array<{ base64: string; mimeType: string }>> {
  const numPages = Math.min(pdfDocument.numPages, maxPages);
  const images: Array<{ base64: string; mimeType: string }> = [];

  for (let i = 1; i <= numPages; i++) {
    const image = await renderPdfPageToImage(pdfDocument, i);
    images.push(image);
  }

  return images;
}
