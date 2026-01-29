// RAG (Retrieval-Augmented Generation) Service
// Combines Gemini knowledge retrieval with OpenAI analysis

import { queryOffenseCode, queryK12DisqualificationRules } from './gemini';
import type { RAGQueryResult } from '../types/legal';

export interface EnrichedCodeInfo {
  code: string;
  ragResult: RAGQueryResult;
  k12Rules: string;
  contextForAI: string;
}

// Enrich a single offense code with RAG context
export async function enrichOffenseCode(code: string): Promise<EnrichedCodeInfo> {
  // Run RAG queries in parallel
  const [ragResult, k12Rules] = await Promise.all([
    queryOffenseCode(code),
    queryK12DisqualificationRules(code),
  ]);

  // Build context string for AI analysis
  const contextForAI = buildAIContext(code, ragResult, k12Rules);

  return {
    code,
    ragResult,
    k12Rules,
    contextForAI,
  };
}

// Enrich multiple offense codes
export async function enrichOffenseCodes(codes: string[]): Promise<Map<string, EnrichedCodeInfo>> {
  const enriched = await Promise.all(codes.map(code => enrichOffenseCode(code)));

  const resultMap = new Map<string, EnrichedCodeInfo>();
  for (const info of enriched) {
    resultMap.set(info.code, info);
  }

  return resultMap;
}

// Build context string for OpenAI analysis
function buildAIContext(
  code: string,
  ragResult: RAGQueryResult,
  k12Rules: string
): string {
  const parts: string[] = [];

  parts.push(`=== OFFENSE CODE: ${code} ===`);

  if (ragResult.found) {
    if (ragResult.statuteText) {
      parts.push(`\n--- Statute Text ---`);
      parts.push(ragResult.statuteText);
    }

    if (ragResult.description) {
      parts.push(`\n--- Description ---`);
      parts.push(ragResult.description);
    }

    if (ragResult.classification) {
      parts.push(`\n--- Classification ---`);
      parts.push(ragResult.classification);
    }

    if (ragResult.penalties) {
      parts.push(`\n--- Penalties ---`);
      parts.push(ragResult.penalties);
    }

    if (ragResult.citations && ragResult.citations.length > 0) {
      parts.push(`\n--- Legal Citations ---`);
      parts.push(ragResult.citations.join('\n'));
    }
  } else {
    parts.push('\nStatute information not found in knowledge base.');
  }

  parts.push(`\n--- K-12 Employment Rules ---`);
  parts.push(k12Rules);

  return parts.join('\n');
}

// Get RAG context as a map for multiple codes (for batch AI analysis)
export async function getRAGContextMap(codes: string[]): Promise<Map<string, string>> {
  const enrichedMap = await enrichOffenseCodes(codes);
  const contextMap = new Map<string, string>();

  for (const [code, info] of enrichedMap) {
    contextMap.set(code, info.contextForAI);
  }

  return contextMap;
}
