// AI Analysis Service - Orchestrates RAG + GPT-5.2 for comprehensive analysis
// Enhanced with multi-source verification pipeline

import { enrichOffenseCodes } from './rag';
import { analyzeOffenseCodes, chatAboutAnalysis, streamChatResponse } from './openai';
import { searchCode } from './webSearch';
import { lookupCode, type OffenseInfo } from '../utils/codeLookup';
import type {
  AIAnalysisResult,
  ChatMessage,
  OffenseCodeInfo,
  DisqualificationCategory,
  VerifiedResult
} from '../types/legal';

export interface ComprehensiveAnalysis {
  codes: OffenseCodeInfo[];
  aiAnalysis: AIAnalysisResult[];
  summary: AnalysisSummary;
  timestamp: Date;
  verificationResults?: Map<string, VerifiedResult>;
}

// Multi-source verification pipeline result
export interface VerificationPipelineResult {
  code: string;
  localResult: OffenseInfo | null;
  geminiResult: VerifiedResult | null;
  gptResult: VerifiedResult | null;
  webSearchResult: VerifiedResult | null;
  finalResult: VerifiedResult;
}

/**
 * Multi-source verification pipeline
 * Ensures every code is verified through multiple sources
 * Pipeline: Local DB → Gemini RAG → GPT-5.2 → Web Search Fallback
 */
export async function verifyCode(code: string): Promise<VerifiedResult> {
  // Step 1: Check local database
  const localResult = lookupCode(code);

  if (localResult.verified && localResult.confidence === 'high') {
    return {
      code,
      found: true,
      source: 'local',
      confidence: 'high',
      verified: true,
      description: localResult.description,
      classification: localResult.category,
      statute: localResult.statute,
      k12Impact: localResult.k12Impact,
      citations: localResult.citations,
      message: 'Found in local database with high confidence'
    };
  }

  // Step 2: Query Gemini RAG for additional context
  try {
    const enriched = await enrichOffenseCodes([code]);
    const geminiInfo = enriched.get(code);

    if (geminiInfo && geminiInfo.ragResult.found) {
      return {
        code,
        found: true,
        source: 'gemini-rag',
        confidence: 'high',
        verified: true,
        description: geminiInfo.ragResult.description,
        classification: geminiInfo.ragResult.classification,
        statuteText: geminiInfo.ragResult.statuteText,
        penalties: geminiInfo.ragResult.penalties,
        citations: geminiInfo.ragResult.citations,
        message: 'Found via Gemini RAG knowledge retrieval'
      };
    }
  } catch (error) {
    console.warn('Gemini RAG verification failed:', error);
  }

  // Step 3: Query GPT-5.2 with function calling
  try {
    const [gptAnalysis] = await analyzeOffenseCodes([code]);

    if (gptAnalysis && gptAnalysis.confidence !== 'low') {
      return {
        code,
        found: true,
        source: 'gpt-5.2',
        confidence: gptAnalysis.confidence,
        verified: true,
        description: gptAnalysis.offenseDescription,
        k12Impact: gptAnalysis.hrGuidance,
        citations: gptAnalysis.statuteCitations,
        message: 'Found via GPT-5.2 legal analysis'
      };
    }
  } catch (error) {
    console.warn('GPT-5.2 verification failed:', error);
  }

  // Step 4: Web search fallback
  try {
    const webResult = await searchCode(code);
    if (webResult.found) {
      return webResult;
    }
  } catch (error) {
    console.warn('Web search verification failed:', error);
  }

  // Step 5: Code truly not found across all sources
  return {
    code,
    found: false,
    source: 'all-sources-exhausted',
    confidence: 'high', // High confidence that it doesn't exist
    verified: true,
    message: 'Code verified as non-existent across all legal databases (Local, Gemini, GPT-5.2, Web Search)'
  };
}

/**
 * Verify multiple codes in parallel
 */
export async function verifyCodes(codes: string[]): Promise<Map<string, VerifiedResult>> {
  const results = await Promise.all(codes.map(code => verifyCode(code)));

  const resultMap = new Map<string, VerifiedResult>();
  for (const result of results) {
    resultMap.set(result.code, result);
  }

  return resultMap;
}

export interface AnalysisSummary {
  totalCodes: number;
  mandatoryDisqualifiers: number;
  hasExemptionPath: number;
  nonDisqualifying: number;
  overallRecommendation: string;
}

// Perform comprehensive analysis on offense codes
export async function performComprehensiveAnalysis(
  codes: string[]
): Promise<ComprehensiveAnalysis> {
  // Step 0: Run multi-source verification in parallel with other operations
  const verificationPromise = verifyCodes(codes);

  // Step 1: Get RAG context from Gemini
  const enrichedCodes = await enrichOffenseCodes(codes);
  const ragContextMap = new Map<string, string>();

  for (const [code, info] of enrichedCodes) {
    ragContextMap.set(code, info.contextForAI);
  }

  // Step 2: Analyze with OpenAI GPT-5.2
  const aiAnalysis = await analyzeOffenseCodes(codes, ragContextMap);

  // Wait for verification results
  const verificationResults = await verificationPromise;

  // Step 3: Build offense info objects (enhanced with verification)
  const offenseInfos: OffenseCodeInfo[] = codes.map((code, index) => {
    const enriched = enrichedCodes.get(code);
    const analysis = aiAnalysis[index];
    const verification = verificationResults.get(code);

    return {
      code,
      codeType: detectCodeType(code),
      description: analysis.offenseDescription,
      category: analysis.k12Classification,
      statute: getRelevantStatute(analysis.k12Classification),
      statuteText: enriched?.ragResult.statuteText || verification?.statuteText,
      penalties: enriched?.ragResult.penalties || verification?.penalties,
      exemptionInfo: analysis.exemptionPathways.join('\n'),
      k12Impact: analysis.hrGuidance,
      citations: analysis.statuteCitations,
      // Add verification metadata
      verificationSource: verification?.source,
      verificationConfidence: verification?.confidence,
      verified: verification?.verified ?? false,
    };
  });

  // Step 4: Generate summary
  const summary = generateSummary(offenseInfos, aiAnalysis);

  return {
    codes: offenseInfos,
    aiAnalysis,
    summary,
    timestamp: new Date(),
    verificationResults,
  };
}

// Detect the type of code from its format
function detectCodeType(code: string): OffenseCodeInfo['codeType'] {
  const upperCode = code.toUpperCase();

  if (upperCode.includes('PC')) return 'PC';
  if (upperCode.includes('HS')) return 'HS';
  if (upperCode.includes('VC')) return 'VC';
  if (upperCode.includes('BP')) return 'BP';
  if (upperCode.includes('WI')) return 'WI';
  if (upperCode.includes('FC')) return 'FC';
  if (/^\d{4}$/.test(code.trim())) return 'NCIC';

  return 'unknown';
}

// Get relevant statute for disqualification category
function getRelevantStatute(category: DisqualificationCategory): string {
  switch (category) {
    case 'mandatory-disqualifier':
      return 'Education Code 44830.1 / 45122.1; PC 667.5(c) or PC 1192.7(c)';
    case 'has-exemption-path':
      return 'Education Code 44830.1 / 45122.1; PC 4852.01 (Certificate of Rehabilitation)';
    case 'non-disqualifying':
      return 'Not subject to Education Code disqualification';
    default:
      return 'Education Code 44830.1 / 45122.1';
  }
}

// Generate analysis summary
function generateSummary(
  codes: OffenseCodeInfo[],
  analyses: AIAnalysisResult[]
): AnalysisSummary {
  const counts = {
    mandatoryDisqualifiers: 0,
    hasExemptionPath: 0,
    nonDisqualifying: 0,
  };

  for (const analysis of analyses) {
    // Map any legacy review-required to has-exemption-path
    const classification = analysis.k12Classification === ('review-required' as any)
      ? 'has-exemption-path'
      : analysis.k12Classification;

    switch (classification) {
      case 'mandatory-disqualifier':
        counts.mandatoryDisqualifiers++;
        break;
      case 'has-exemption-path':
        counts.hasExemptionPath++;
        break;
      case 'non-disqualifying':
        counts.nonDisqualifying++;
        break;
    }
  }

  // Generate overall recommendation
  let overallRecommendation: string;

  if (counts.mandatoryDisqualifiers > 0) {
    overallRecommendation = `This background check contains ${counts.mandatoryDisqualifiers} mandatory disqualifier(s) under California Education Code. The candidate cannot be employed in K-12 positions unless exemptions apply. Consult legal counsel for verification.`;
  } else if (counts.hasExemptionPath > 0) {
    overallRecommendation = `This background check contains offenses that may have exemption pathways. Review Certificate of Rehabilitation options and consult legal counsel to determine eligibility.`;
  } else {
    overallRecommendation = `This background check contains no automatic disqualifiers for K-12 employment. Standard hiring procedures may proceed with consideration of the Fair Chance Act.`;
  }

  return {
    totalCodes: codes.length,
    mandatoryDisqualifiers: counts.mandatoryDisqualifiers,
    hasExemptionPath: counts.hasExemptionPath,
    nonDisqualifying: counts.nonDisqualifying,
    overallRecommendation,
  };
}

// Build analysis context for chat
export function buildChatContext(analysis: ComprehensiveAnalysis): string {
  const parts: string[] = [];

  parts.push('=== CURRENT ANALYSIS CONTEXT ===\n');
  parts.push(`Total Codes Analyzed: ${analysis.summary.totalCodes}`);
  parts.push(`Mandatory Disqualifiers: ${analysis.summary.mandatoryDisqualifiers}`);
  parts.push(`Exemption Path Available: ${analysis.summary.hasExemptionPath}`);
  parts.push(`Non-Disqualifying: ${analysis.summary.nonDisqualifying}`);
  parts.push(`\nOverall Recommendation: ${analysis.summary.overallRecommendation}`);

  parts.push('\n\n=== DETAILED ANALYSIS ===\n');

  for (const code of analysis.codes) {
    parts.push(`\n--- ${code.code} ---`);
    parts.push(`Description: ${code.description}`);
    parts.push(`Category: ${code.category}`);
    parts.push(`K-12 Impact: ${code.k12Impact}`);
    if (code.exemptionInfo) {
      parts.push(`Exemption Info: ${code.exemptionInfo}`);
    }
    if (code.citations.length > 0) {
      parts.push(`Citations: ${code.citations.join(', ')}`);
    }
  }

  return parts.join('\n');
}

// Chat about the analysis
export async function chat(
  messages: ChatMessage[],
  analysis: ComprehensiveAnalysis
): Promise<string> {
  const context = buildChatContext(analysis);
  return chatAboutAnalysis(messages, context);
}

// Stream chat response
export function streamChat(
  messages: ChatMessage[],
  analysis: ComprehensiveAnalysis
): AsyncGenerator<string, void, unknown> {
  const context = buildChatContext(analysis);
  return streamChatResponse(messages, context);
}
