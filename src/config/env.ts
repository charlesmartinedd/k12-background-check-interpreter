// Environment configuration for API keys
// Keys are loaded from .env.local (gitignored)

export const config = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
    model: 'gpt-5.2', // OpenAI GPT-5.2 Thinking model
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY as string,
    model: 'gemini-2.0-flash', // Fast model for RAG queries
  },
} as const;

// Validate that required API keys are present
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.openai.apiKey) {
    errors.push('VITE_OPENAI_API_KEY is not set');
  }

  if (!config.gemini.apiKey) {
    errors.push('VITE_GEMINI_API_KEY is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check if AI features are available
export function isAIEnabled(): boolean {
  return Boolean(config.openai.apiKey && config.gemini.apiKey);
}
