import { z } from 'zod';

export const ProjectInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(8),
  requirements: z.string().min(8),
  expectedScale: z.string().default('100K monthly users'),
  frontendPreference: z.string().default('React + TypeScript'),
  backendPreference: z.string().default('Node.js + Express'),
  databasePreference: z.string().default('PostgreSQL'),
  authenticationMethod: z.string().default('JWT sessions'),
  externalServices: z.array(z.string()).default([]),
  optionalRequirements: z.string().default(''),
});

export const RequirementAnalysisSchema = z.object({
  summary: z.string(),
  functional: z.array(z.string()),
  nonFunctional: z.array(z.string()),
  missingQuestions: z.array(z.string()),
  recommendedCapabilities: z.array(z.string()),
  reasoning: z.array(z.string()),
});

export type ProjectInput = z.infer<typeof ProjectInputSchema>;
export type RequirementAnalysis = z.infer<typeof RequirementAnalysisSchema>;
