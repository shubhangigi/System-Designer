import { ArchitectureModelSchema, type ArchitectureModel, type RequirementAnalysis } from '@archspace/shared';
import { buildRetrievedContext } from '../../modules/rag/Retriever.js';
import { buildArchitectureUserPrompt } from '../prompts/architectPrompt.js';
import { createArchitecture } from '../../modules/architecture/ArchitectureService.js';
import { analyzeRequirements } from '../../modules/requirements/RequirementService.js';
import type { ProjectContext } from '../providers/AIProvider.js';
import { AIProviderNotConfiguredError, AIProviderError, AIResponseParseError } from '../providers/AIProvider.js';
import { getAIProvider } from '../providers/providerFactory.js';
import { AIArchitectureOutputSchema, transformToCanonicalModel } from '../schemas/aiArchitectureSchema.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GenerationMetadata {
  generatedBy: 'ai' | 'heuristic';
  provider?: string;
  model?: string;
  generatedAt: string;
  version: number;
}

export interface ArchitectureGenerationResult {
  architecture: ArchitectureModel;
  analysis: RequirementAnalysis;
  metadata: GenerationMetadata;
}

// ---------------------------------------------------------------------------
// AI-powered generation
// ---------------------------------------------------------------------------

const MAX_RETRIES = 1;

export async function generateArchitectureWithAI(
  requirements: string,
  context: ProjectContext,
): Promise<ArchitectureGenerationResult> {
  const provider = getAIProvider(); // throws AIProviderNotConfiguredError if not set

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // RAG: retrieve relevant architectural knowledge
      const retrievedContext = buildRetrievedContext(requirements);
      console.log(`[System Designer RAG] Retrieved ${retrievedContext ? 'context' : 'no context'} for requirements`);

      const augmentedRequirements = buildArchitectureUserPrompt(requirements, context, retrievedContext);
      const rawContent = await provider.generateArchitecture(augmentedRequirements, context);

      // Step 2: Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        throw new AIResponseParseError(
          `AI returned invalid JSON (attempt ${attempt + 1}). Response starts with: ${rawContent.slice(0, 120)}`,
        );
      }

      // Step 3: Validate against AI output schema
      const aiOutput = AIArchitectureOutputSchema.parse(parsed);

      // Step 4: Transform to canonical model
      const canonicalModel = transformToCanonicalModel(aiOutput, context);

      // Step 5: Final validation against canonical schema (safety check)
      const validatedArchitecture = ArchitectureModelSchema.parse(canonicalModel);

      // Step 6: Extract RequirementAnalysis from AI output
      const analysis: RequirementAnalysis = {
        summary: `${aiOutput.project.name}: ${aiOutput.project.description}`,
        functional: aiOutput.project.requirements,
        nonFunctional: [
          `Scale target: ${context.expectedScale}`,
          ...(aiOutput.authentication.required ? ['Authentication and authorization required'] : []),
          ...(aiOutput.cache.required ? [`Caching with ${aiOutput.cache.technology}`] : []),
          ...(aiOutput.queue.required ? [`Async processing with ${aiOutput.queue.technology}`] : []),
        ],
        missingQuestions: [],
        recommendedCapabilities: aiOutput.project.requirements,
        reasoning: aiOutput.architectureDecisions.map((d) => `${d.decision}: ${d.reasoning}`),
      };

      return {
        architecture: validatedArchitecture,
        analysis,
        metadata: {
          generatedBy: 'ai',
          provider: provider.providerName,
          model: provider.modelName,
          generatedAt: new Date().toISOString(),
          version: 1,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on config errors — they won't fix themselves
      if (error instanceof AIProviderNotConfiguredError) throw error;

      // Log safely (no API keys)
      console.error(
        `[ArchSpace] Architecture generation attempt ${attempt + 1} failed:`,
        lastError.message,
      );

      // On last attempt, throw
      if (attempt >= MAX_RETRIES) break;
    }
  }

  // Wrap the last error in a user-friendly type if it isn't already
  if (lastError instanceof AIProviderError || lastError instanceof AIResponseParseError) {
    throw lastError;
  }
  throw new AIResponseParseError(
    `AI returned an invalid architecture response after ${MAX_RETRIES + 1} attempt(s). ${lastError?.message ?? ''}`,
  );
}

// ---------------------------------------------------------------------------
// Heuristic-based generation (explicit dev/test mode only)
// ---------------------------------------------------------------------------

export function generateArchitectureWithHeuristic(
  input: { name: string; description: string; requirements: string; [key: string]: unknown },
): ArchitectureGenerationResult {
  const fullInput = {
    name: input.name,
    description: input.description,
    requirements: input.requirements,
    expectedScale: String(input.expectedScale ?? '100K monthly users'),
    frontendPreference: String(input.frontendPreference ?? 'React + TypeScript'),
    backendPreference: String(input.backendPreference ?? 'Node.js + Express'),
    databasePreference: String(input.databasePreference ?? 'PostgreSQL'),
    authenticationMethod: String(input.authenticationMethod ?? 'JWT sessions'),
    externalServices: Array.isArray(input.externalServices) ? (input.externalServices as string[]) : [],
    optionalRequirements: String(input.optionalRequirements ?? ''),
  };

  const analysis = analyzeRequirements(fullInput);
  const architecture = createArchitecture(fullInput, analysis);

  return {
    architecture,
    analysis,
    metadata: {
      generatedBy: 'heuristic',
      generatedAt: new Date().toISOString(),
      version: 1,
    },
  };
}
