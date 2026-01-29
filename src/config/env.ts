// Environment configuration for API keys
// Keys are loaded from .env.local (gitignored)

export const config = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
    model: 'gpt-5.2-chat-latest', // OpenAI GPT-5.2 Chat model
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY as string,
    model: 'gemini-2.5-flash', // Gemini 2.5 Flash for RAG/file store
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
