import Retell from 'retell-sdk';

// Server-side Retell client (with API key)
export function createRetellClient() {
  if (!process.env.RETELL_API_KEY) {
    throw new Error('RETELL_API_KEY is required');
  }

  return new Retell({
    apiKey: process.env.RETELL_API_KEY,
  });
}

// Types for our agent management
export type RetellAgent = {
  agent_id: string;
  agent_name?: string;
  voice_id: string;
  response_engine: {
    type: 'retell-llm';
    llm_id: string;
  };
  language?: string;
  webhook_url?: string;
  boosted_keywords?: string[];
  enable_backchannel?: boolean;
  ambient_sound?: string;
  agent_description?: string;
  // Add more fields as needed based on requirements
};

// Default configuration for new agents
export const DEFAULT_AGENT_CONFIG = {
  language: 'en-US',
  enable_backchannel: true,
  ambient_sound: 'office',
} as const;