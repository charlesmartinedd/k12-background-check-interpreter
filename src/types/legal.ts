// Legal data types for K-12 Background Check Interpreter V2

export type DisqualificationCategory =
  | 'mandatory-disqualifier'    // PC 667.5(c) violent felonies, PC 1192.7(c) serious felonies
  | 'has-exemption-path'        // Serious offenses with rehabilitation pathway
  | 'non-disqualifying';        // Does not bar K-12 employment

// Multi-source verification types
export type VerificationSource =
  | 'local'                     // Local JSON database
  | 'gemini-rag'                // Gemini RAG with file store
  | 'gpt-5.2'                   // OpenAI GPT-5.2 analysis
  | 'web-search'                // Web search fallback
  | 'all-sources-exhausted';    // Code verified as non-existent

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface VerifiedResult {
  code: string;
  found: boolean;
  source: VerificationSource;
  confidence: ConfidenceLevel;
  verified: boolean;
  description?: string;
  classification?: string;
  statute?: string;
  statuteText?: string;
  penalties?: string;
  k12Impact?: string;
  citations?: string[];
  message?: string;
}

export interface OffenseCodeInfo {
  code: string;                 // e.g., "484 PC", "11377 HS", "23152 VC"
  codeType: 'PC' | 'HS' | 'VC' | 'BP' | 'WI' | 'FC' | 'NCIC' | 'unknown';
  description: string;          // Plain English description
  category: DisqualificationCategory;
  statute?: string;             // Relevant Education Code citation
  statuteText?: string;         // Exact statute text from RAG
  penalties?: string;           // Potential penalties
  exemptionInfo?: string;       // Rehabilitation/exemption pathways
  k12Impact: string;            // Impact on K-12 employment
  citations: string[];          // Legal citations supporting the analysis
  // Multi-source verification metadata
  verificationSource?: VerificationSource;
  verificationConfidence?: ConfidenceLevel;
  verified?: boolean;
}

export interface RAGQueryResult {
  code: string;
  found: boolean;
  statuteText?: string;
  description?: string;
  classification?: string;
  penalties?: string;
  citations: string[];
  rawResponse?: string;
}

export interface AIAnalysisResult {
  code: string;
  offenseDescription: string;
  k12Classification: DisqualificationCategory;
  explanation: string;
  exemptionPathways: string[];
  hrGuidance: string;
  statuteCitations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AnalysisSession {
  id: string;
  codes: OffenseCodeInfo[];
  aiAnalysis: AIAnalysisResult[];
  chatHistory: ChatMessage[];
  createdAt: Date;
}
