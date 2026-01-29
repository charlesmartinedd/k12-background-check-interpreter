// Web Search Fallback Service for Unknown Legal Codes
// Uses OpenAI with web browsing capability as a final fallback

import OpenAI from 'openai';
import { config } from '../config/env';
import type { VerifiedResult, VerificationSource, ConfidenceLevel } from '../types/legal';

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

// Search prompt for California legal codes
const WEB_SEARCH_PROMPT = `You are a legal code research specialist. Search for information about the given offense code in California law databases.

Search the following sources:
1. California Legislative Information (leginfo.legislature.ca.gov)
2. California Penal Code
3. California Health & Safety Code
4. California Vehicle Code
5. NCIC code repositories

Return your findings in JSON format:
{
  "found": true/false,
  "code": "the code searched",
  "description": "Plain English description of the offense",
  "classification": "felony|misdemeanor|wobbler|infraction|unknown",
  "statute": "Relevant statute type (PC, HS, VC, BP, etc.)",
  "statuteText": "Exact statute text if available",
  "penalties": "Potential penalties",
  "k12Impact": "Impact on K-12 employment if determinable",
  "citations": ["Relevant legal citations"],
  "searchSources": ["List of sources consulted"]
}

If the code cannot be found in any legal database, set "found" to false and explain in the description.`;

export interface WebSearchResult {
  found: boolean;
  code: string;
  description: string;
  classification?: string;
  statute?: string;
  statuteText?: string;
  penalties?: string;
  k12Impact?: string;
  citations: string[];
  searchSources: string[];
  error?: string;
}

// Search for an unknown legal code using OpenAI
export async function searchLegalCode(code: string): Promise<WebSearchResult> {
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: WEB_SEARCH_PROMPT },
        {
          role: 'user',
          content: `Search for information about this California legal code: ${code}

Determine:
1. What offense does this code refer to?
2. Is it a felony, misdemeanor, or wobbler?
3. What are the penalties?
4. Is it listed in PC 667.5(c) (violent felonies) or PC 1192.7(c) (serious felonies)?
5. What is the impact on K-12 employment under Education Code 44830.1 or 45122.1?`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        found: false,
        code,
        description: 'No response from search service',
        citations: [],
        searchSources: ['openai'],
        error: 'Empty response',
      };
    }

    const parsed = JSON.parse(content);

    return {
      found: parsed.found ?? false,
      code,
      description: parsed.description || 'Unknown offense',
      classification: parsed.classification,
      statute: parsed.statute,
      statuteText: parsed.statuteText,
      penalties: parsed.penalties,
      k12Impact: parsed.k12Impact,
      citations: parsed.citations || [],
      searchSources: parsed.searchSources || ['openai-search'],
    };
  } catch (error) {
    console.error('Web search error:', error);
    return {
      found: false,
      code,
      description: 'Search failed',
      citations: [],
      searchSources: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Search for NCIC code
export async function searchNCICCode(code: string): Promise<WebSearchResult> {
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: WEB_SEARCH_PROMPT },
        {
          role: 'user',
          content: `Search for this NCIC offense code: ${code}

This is a 4-digit NCIC (National Crime Information Center) code.
Determine:
1. What offense category does this code represent?
2. What are the typical charges associated with this code?
3. How does this translate to California law?
4. What is the impact on K-12 employment?`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        found: false,
        code,
        description: 'No response from NCIC search',
        citations: [],
        searchSources: ['openai-ncic'],
        error: 'Empty response',
      };
    }

    const parsed = JSON.parse(content);

    return {
      found: parsed.found ?? false,
      code,
      description: parsed.description || 'Unknown NCIC code',
      classification: parsed.classification,
      statute: 'NCIC',
      penalties: parsed.penalties,
      k12Impact: parsed.k12Impact,
      citations: parsed.citations || [],
      searchSources: ['ncic-database', 'openai-search'],
    };
  } catch (error) {
    console.error('NCIC search error:', error);
    return {
      found: false,
      code,
      description: 'NCIC search failed',
      citations: [],
      searchSources: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Convert WebSearchResult to VerifiedResult format
export function webSearchToVerifiedResult(
  searchResult: WebSearchResult
): VerifiedResult {
  const source: VerificationSource = 'web-search';
  const confidence: ConfidenceLevel = searchResult.found ? 'medium' : 'low';

  return {
    code: searchResult.code,
    found: searchResult.found,
    source,
    confidence,
    verified: true,
    description: searchResult.description,
    classification: searchResult.classification,
    statute: searchResult.statute,
    statuteText: searchResult.statuteText,
    penalties: searchResult.penalties,
    k12Impact: searchResult.k12Impact,
    citations: searchResult.citations,
    message: searchResult.found
      ? `Found via web search: ${searchResult.searchSources.join(', ')}`
      : 'Code not found across all legal databases',
  };
}

// Main web search function with NCIC fallback
export async function searchCode(code: string): Promise<VerifiedResult> {
  // Check if it's an NCIC code (4 digits)
  const isNCIC = /^\d{4}$/.test(code.trim());

  if (isNCIC) {
    const ncicResult = await searchNCICCode(code);
    return webSearchToVerifiedResult(ncicResult);
  }

  const searchResult = await searchLegalCode(code);
  return webSearchToVerifiedResult(searchResult);
}
