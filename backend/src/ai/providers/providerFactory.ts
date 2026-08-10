import { environment } from '../../config/environment.js';
import { type AIProvider, AIProviderNotConfiguredError } from './AIProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export { AIProviderNotConfiguredError } from './AIProvider.js';
export { AIProviderError, AIResponseParseError } from './AIProvider.js';

export function getAIProvider(): AIProvider {
  if (!environment.aiProvider) {
    throw new AIProviderNotConfiguredError();
  }

  if (!environment.aiApiKey) {
    throw new AIProviderNotConfiguredError('AI_API_KEY is not set. Provide an API key for the configured AI provider.');
  }

  return new OpenAICompatibleProvider(
    environment.aiProvider,
    environment.aiBaseUrl,
    environment.aiApiKey,
    environment.aiModel,
    environment.aiTimeoutMs,
  );
}
