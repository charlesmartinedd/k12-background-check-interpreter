// Google Gemini Service for RAG-based Legal Knowledge Retrieval

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import type { RAGQueryResult } from '../types/legal';

// Initialize Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return geminiClient;
}

// RAG query prompt for legal code lookup
const RAG_QUERY_PROMPT = `You are a legal research assistant specializing in California criminal law and K-12 employment regulations.

Given an offense code, provide the following information in JSON format:
{
  "found": true/false,
  "statuteText": "Exact text of the relevant statute if available",
  "description": "Plain English description of the offense",
  "classification": "felony|misdemeanor|wobbler|infraction",
  "penalties": "Potential penalties for this offense",
  "citations": ["Array of relevant legal citations"]
}

Be accurate and cite specific California Penal Code, Health & Safety Code, Vehicle Code, Education Code, or NCIC references as appropriate.

If the code is not found or cannot be accurately determined, set "found" to false and provide a helpful message in the description.`;

// Query Gemini for offense code information
export async function queryOffenseCode(code: string): Promise<RAGQueryResult> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: config.gemini.model });

  try {
    const prompt = `${RAG_QUERY_PROMPT}

Look up this offense code: ${code}

Provide comprehensive information about this offense, including:
1. The exact statute text
2. Whether it's a felony, misdemeanor, or wobbler
3. Potential penalties
4. Any relevant K-12 employment implications under Education Code 44830.1 or 45122.1
5. Whether it's listed under PC 667.5(c) (violent felonies) or PC 1192.7(c) (serious felonies)`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try to parse as JSON
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          code,
          found: parsed.found ?? true,
          statuteText: parsed.statuteText,
          description: parsed.description,
          classification: parsed.classification,
          penalties: parsed.penalties,
          citations: parsed.citations || [],
          rawResponse: text,
        };
      }
    } catch {
      // If JSON parsing fails, return raw response
    }

    return {
      code,
      found: true,
      description: text,
      citations: [],
      rawResponse: text,
    };
  } catch (error) {
    console.error('Gemini query error:', error);
    return {
      code,
      found: false,
      description: 'Unable to retrieve information for this code.',
      citations: [],
    };
  }
}

// Query multiple offense codes in parallel
export async function queryOffenseCodes(codes: string[]): Promise<Map<string, RAGQueryResult>> {
  const results = await Promise.all(codes.map(code => queryOffenseCode(code)));

  const resultMap = new Map<string, RAGQueryResult>();
  for (const result of results) {
    resultMap.set(result.code, result);
  }

  return resultMap;
}

// Query for K-12 disqualification rules
export async function queryK12DisqualificationRules(code: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: config.gemini.model });

  const prompt = `Given the California offense code "${code}", determine its impact on K-12 employment eligibility.

Reference the following California Education Code sections:
- Section 44830.1 (certificated employees)
- Section 45122.1 (classified employees)

And cross-reference with:
- PC 667.5(c) - list of violent felonies
- PC 1192.7(c) - list of serious felonies

Explain:
1. Is this a mandatory disqualifier for K-12 employment?
2. If not mandatory, are there circumstances where it could disqualify?
3. Are there any exemption pathways (Certificate of Rehabilitation, etc.)?
4. What individualized assessment factors should HR consider?

Provide specific statute citations for your analysis.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('K-12 rules query error:', error);
    return 'Unable to determine K-12 disqualification status. Please consult legal counsel.';
  }
}

// Query for Certificate of Rehabilitation information
export async function queryCertificateOfRehabilitation(code: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: config.gemini.model });

  const prompt = `For the offense "${code}", explain the Certificate of Rehabilitation process under California Penal Code Section 4852.01.

Include:
1. Is this offense eligible for a Certificate of Rehabilitation?
2. What are the waiting period requirements?
3. What is the application process?
4. How does the Certificate of Rehabilitation affect K-12 employment eligibility?
5. Are there any offenses that cannot be rehabilitated for K-12 purposes?

Provide practical guidance for candidates who may be interested in this pathway.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('COR query error:', error);
    return 'Unable to retrieve Certificate of Rehabilitation information.';
  }
}
