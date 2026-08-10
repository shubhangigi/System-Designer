export interface ProjectContext {
  projectName: string;
  description: string;
  frontendPreference: string;
  backendPreference: string;
  databasePreference: string;
  authenticationMethod: string;
  expectedScale: string;
}

export interface AIProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateArchitecture(requirements: string, context: ProjectContext): Promise<string>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor(message = 'AI provider is not configured. Set AI_PROVIDER, AI_API_KEY, and AI_BASE_URL environment variables.') {
    super(message);
    this.name = 'AIProviderNotConfiguredError';
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIResponseParseError';
  }
}
