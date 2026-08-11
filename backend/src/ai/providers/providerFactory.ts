import { environment } from '../../config/environment.js';
import { type AIProvider, AIProviderNotConfiguredError } from './AIProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export { AIProviderNotConfiguredError } from './AIProvider.js';
export { AIProviderError, AIResponseParseError } from './AIProvider.js';

export function getAIProvider(): AIProvider {
  const rawProvider = environment.aiProvider.toLowerCase().trim();

  if (!rawProvider) {
    throw new AIProviderNotConfiguredError();
  }

  const isCollegeModel = ['college-model', 'college', 'custom-model', 'custom-local'].includes(rawProvider);
  const isLocalProvider = isCollegeModel ||
    ['ollama', 'local', 'local-ai', 'llamacpp', 'lmstudio'].includes(rawProvider) ||
    environment.aiBaseUrl.includes('localhost') ||
    environment.aiBaseUrl.includes('127.0.0.1');

  if (!isLocalProvider && !environment.aiApiKey) {
    throw new AIProviderNotConfiguredError('AI_API_KEY is not set. Provide an API key for the cloud AI provider, or set AI_PROVIDER=college-model to use your local custom model.');
  }

  let providerName = rawProvider;
  if (isCollegeModel) {
    providerName = 'College-Trained-Model';
  } else if (rawProvider === 'ollama') {
    providerName = 'Ollama-Local';
  }

  const defaultUrl = isCollegeModel ? 'http://localhost:8000/v1' : 'http://localhost:11434/v1';
  const baseUrl = environment.aiBaseUrl || (isLocalProvider ? defaultUrl : 'https://api.openai.com/v1');
  const apiKey = environment.aiApiKey || (isLocalProvider ? 'local-model-key' : '');
  
  let modelName = environment.aiModel;
  if (!modelName || modelName === 'gpt-4o-mini') {
    if (isCollegeModel) modelName = 'system-designer-v1:latest';
    else if (isLocalProvider) modelName = 'system-designer-v1:latest';
  }

  return new OpenAICompatibleProvider(
    providerName,
    baseUrl,
    apiKey,
    modelName,
    environment.aiTimeoutMs,
  );
}
