// OpenAI GPT-5.2 Service for K-12 Background Check Analysis

import OpenAI from 'openai';
import { config } from '../config/env';
import type { AIAnalysisResult, DisqualificationCategory, ChatMessage } from '../types/legal';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }
  return openaiClient;
}

// System prompt for K-12 background check analysis
const SYSTEM_PROMPT = `You are a K-12 employment background check specialist with expertise in:
- California Education Code sections 44830.1 and 45122.1
- California Penal Code violent felonies (PC 667.5(c))
- California Penal Code serious felonies (PC 1192.7(c))
- Certificate of Rehabilitation (PC 4852.01)
- California Fair Chance Act

Your role is to:
1. Translate offense codes into plain English
2. Determine if an offense is a mandatory disqualifier for K-12 employment
3. Identify available exemption pathways
4. Provide fair, balanced guidance that considers rehabilitation

IMPORTANT CLASSIFICATIONS (use ONLY these 3 categories):
- "mandatory-disqualifier": Violent felonies under PC 667.5(c) or certain serious felonies under PC 1192.7(c) - CANNOT be hired
- "has-exemption-path": Offenses that may have rehabilitation pathways (Certificate of Rehabilitation, etc.) - MAY be hired with proper exemption
- "non-disqualifying": Offenses that do not automatically bar K-12 employment - CAN be hired

NEVER use "review-required" - always classify into one of the 3 categories above.

Always cite specific statute sections. Never provide legal advice - recommend consultation with legal counsel for complex cases.

Respond in JSON format with the following structure:
{
  "offenseDescription": "Plain English description of the offense",
  "k12Classification": "mandatory-disqualifier|has-exemption-path|non-disqualifying",
  "explanation": "Why this classification applies",
  "exemptionPathways": ["Array of possible exemption routes if any"],
  "hrGuidance": "Specific guidance for HR professionals",
  "statuteCitations": ["Array of relevant statute citations"],
  "confidence": "high|medium|low"
}`;

// Guardrail system prompt for AI chat assistant
const CHAT_GUARDRAILS = `
=== CRITICAL GUARDRAILS - FOLLOW THESE STRICTLY ===

1. NO LEGAL ADVICE: You are an informational assistant, NOT a lawyer.
   - NEVER tell users what decision to make about hiring
   - NEVER say "you should hire" or "you should not hire"
   - ALWAYS recommend consulting a qualified employment attorney for legal decisions
   - Use phrases like "California law indicates..." rather than "You must..."

2. STAY ON TOPIC: Only discuss K-12 background check matters.
   - If asked about unrelated topics (weather, sports, general chat), politely redirect:
     "I'm specialized in K-12 background check analysis. How can I help you understand the employment implications of an offense?"
   - Acceptable topics: offense codes, disqualification rules, exemptions, rehabilitation, California Education Code, fair chance hiring

3. NO PII HANDLING: Never process or store personally identifiable information.
   - If a user tries to share names, SSNs, DOBs, or other PII, respond:
     "I don't process personal information. Please only share offense codes for analysis."
   - Never reference specific individuals by name
   - Focus solely on the offense codes, not the person

4. BIAS PREVENTION: Maintain objectivity and fairness.
   - Always mention rehabilitation pathways when applicable
   - Use neutral, non-judgmental language about past offenses
   - Focus on legal requirements, not moral judgments
   - Acknowledge that people can change and rehabilitate

5. ACCURACY & CITATIONS: Always cite your sources.
   - Reference specific California Education Code sections (44830.1, 45122.1)
   - Cite Penal Code sections (667.5(c), 1192.7(c), 4852.01)
   - If uncertain, say so clearly rather than guessing

6. DISCLAIMER: Every response should acknowledge limitations.
   - This is informational assistance, not legal advice
   - Laws may change; recommend verifying current statutes
   - Complex cases require attorney consultation

=== END GUARDRAILS ===
`;

// Topic detection for guardrails
const OFF_TOPIC_KEYWORDS = [
  'weather', 'sports', 'recipe', 'joke', 'story', 'movie', 'music',
  'politics', 'news', 'stock', 'crypto', 'game', 'dating', 'relationship'
];

const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/,           // DOB
  /\b\d{2}-\d{2}-\d{4}\b/,             // DOB
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,       // Full name pattern
];

// Check if input contains PII
export function containsPII(input: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(input));
}

// Check if input is off-topic
export function isOffTopic(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return OFF_TOPIC_KEYWORDS.some(keyword => lowerInput.includes(keyword));
}

// Sanitize user input
export function sanitizeInput(input: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];

  // Check for PII
  if (containsPII(input)) {
    warnings.push('Personal information detected and removed for privacy.');
  }

  // Remove potential PII patterns
  let sanitized = input;
  PII_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return { sanitized, warnings };
}

// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Analyze a single offense code
export async function analyzeOffenseCode(
  code: string,
  ragContext?: string
): Promise<AIAnalysisResult> {
  const client = getClient();

  const userPrompt = ragContext
    ? `Analyze this offense code for K-12 employment eligibility:\n\nCode: ${code}\n\nRelevant statute information:\n${ragContext}`
    : `Analyze this offense code for K-12 employment eligibility: ${code}`;

  try {
    const response = await withRetry(async () => {
      return client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent legal analysis
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    // Map any legacy 'review-required' to 'has-exemption-path'
    let classification = parsed.k12Classification as DisqualificationCategory;
    if (classification === 'review-required' as any) {
      classification = 'has-exemption-path';
    }

    return {
      code,
      offenseDescription: parsed.offenseDescription || 'Unknown offense',
      k12Classification: classification || 'has-exemption-path',
      explanation: parsed.explanation || '',
      exemptionPathways: parsed.exemptionPathways || [],
      hrGuidance: parsed.hrGuidance || '',
      statuteCitations: parsed.statuteCitations || [],
      confidence: parsed.confidence || 'medium',
    };
  } catch (error) {
    console.error('OpenAI analysis error after retries:', error);
    // Conservative fallback - has-exemption-path allows hiring with proper process
    return {
      code,
      offenseDescription: `Offense code ${code} - requires legal verification`,
      k12Classification: 'has-exemption-path',
      explanation: 'Unable to complete automated analysis. This offense may have exemption pathways available.',
      exemptionPathways: ['Certificate of Rehabilitation', 'Consult legal counsel for verification'],
      hrGuidance: 'Consult with legal counsel to determine eligibility and available exemption pathways.',
      statuteCitations: ['Education Code 44830.1', 'Education Code 45122.1'],
      confidence: 'low',
    };
  }
}

// Analyze multiple offense codes
export async function analyzeOffenseCodes(
  codes: string[],
  ragContexts?: Map<string, string>
): Promise<AIAnalysisResult[]> {
  const analyses = await Promise.all(
    codes.map(code => analyzeOffenseCode(code, ragContexts?.get(code)))
  );
  return analyses;
}

// Chat with AI about analysis results (with guardrails)
export async function chatAboutAnalysis(
  messages: ChatMessage[],
  analysisContext: string
): Promise<string> {
  const client = getClient();

  // Check last user message for guardrail violations
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    // Check for off-topic questions
    if (isOffTopic(lastUserMessage.content)) {
      return "I'm specialized in K-12 background check analysis and can only help with questions about offense codes, disqualification rules, exemptions, and California employment law. How can I assist you with your background check analysis?";
    }

    // Check for PII
    if (containsPII(lastUserMessage.content)) {
      return "I noticed personal information in your message. For privacy protection, I don't process names, social security numbers, or other personally identifiable information. Please share only offense codes (like '484 PC' or '211 PC') and I'll help you understand their K-12 employment implications.";
    }
  }

  const chatSystemPrompt = `${SYSTEM_PROMPT}

${CHAT_GUARDRAILS}

You are now in a conversation with an HR professional about background check results. Here is the context of the current analysis:

${analysisContext}

REMEMBER:
- Provide helpful, accurate information about the analyzed codes
- Always cite California Education Code and Penal Code sections
- Recommend attorney consultation for hiring decisions
- Maintain a rehabilitation-positive perspective
- End responses with a brief disclaimer when providing substantive guidance`;

  try {
    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: chatSystemPrompt },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    // Ensure disclaimer is present for substantive responses
    if (content.length > 200 && !content.toLowerCase().includes('not legal advice') && !content.toLowerCase().includes('consult')) {
      return content + '\n\n*Note: This information is for educational purposes only and does not constitute legal advice. Please consult with a qualified employment attorney for specific hiring decisions.*';
    }

    return content;
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw error;
  }
}

// Stream chat response for better UX (with guardrails)
export async function* streamChatResponse(
  messages: ChatMessage[],
  analysisContext: string
): AsyncGenerator<string, void, unknown> {
  const client = getClient();

  // Check last user message for guardrail violations
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    // Check for off-topic questions
    if (isOffTopic(lastUserMessage.content)) {
      yield "I'm specialized in K-12 background check analysis and can only help with questions about offense codes, disqualification rules, exemptions, and California employment law. How can I assist you with your background check analysis?";
      return;
    }

    // Check for PII
    if (containsPII(lastUserMessage.content)) {
      yield "I noticed personal information in your message. For privacy protection, I don't process names, social security numbers, or other personally identifiable information. Please share only offense codes (like '484 PC' or '211 PC') and I'll help you understand their K-12 employment implications.";
      return;
    }
  }

  const chatSystemPrompt = `${SYSTEM_PROMPT}

${CHAT_GUARDRAILS}

You are now in a conversation with an HR professional about background check results. Here is the context of the current analysis:

${analysisContext}

REMEMBER:
- Provide helpful, accurate information about the analyzed codes
- Always cite California Education Code and Penal Code sections
- Recommend attorney consultation for hiring decisions
- Maintain a rehabilitation-positive perspective`;

  const stream = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: 'system', content: chatSystemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ],
    temperature: 0.5,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
