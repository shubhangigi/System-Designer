import { AIProvider, ProjectContext, AIProviderError } from './AIProvider.js';
import { ARCHITECT_SYSTEM_PROMPT } from '../prompts/architectPrompt.js';

export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public readonly providerName: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    public readonly modelName: string,
    private readonly timeoutMs: number
  ) {}

  async generateArchitecture(requirements: string, context: ProjectContext): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: `Context:\n${JSON.stringify(context, null, 2)}\n\nRequirements:\n${requirements}`
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error text');
        throw new AIProviderError(`API call failed with HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content || typeof content !== 'string') {
        throw new AIProviderError('API returned an empty or invalid content response.');
      }

      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new AIProviderError(`API request timed out after ${this.timeoutMs}ms.`);
      }
      if (err instanceof AIProviderError) {
        throw err;
      }
      throw new AIProviderError(`Network or fetch error: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
