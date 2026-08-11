import { loadKnowledgeBase, type KnowledgeDocument } from './KnowledgeLoader.js';
import { chunkDocument, type DocumentChunk } from './DocumentChunker.js';

/**
 * Keyword-based retriever that uses TF-IDF-style scoring to find relevant documents.
 * This is a robust fallback that works without any external embedding API.
 * It is deterministic, fast, and testable.
 */

export interface RetrievalResult {
  chunk: DocumentChunk;
  document: KnowledgeDocument;
  score: number;
}

let cachedDocuments: KnowledgeDocument[] | null = null;
let cachedChunks: { chunk: DocumentChunk; document: KnowledgeDocument }[] | null = null;

function getIndexedChunks() {
  if (cachedChunks) return cachedChunks;

  const documents = loadKnowledgeBase();
  cachedDocuments = documents;
  const all: { chunk: DocumentChunk; document: KnowledgeDocument }[] = [];

  for (const doc of documents) {
    const chunks = chunkDocument(doc.id, doc.content);
    for (const chunk of chunks) {
      all.push({ chunk, document: doc });
    }
  }

  cachedChunks = all;
  return all;
}

/**
 * Score a text against a query using keyword overlap + category boosting.
 */
function scoreChunk(text: string, queryTerms: string[], category: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    // Count occurrences
    const matches = (lowerText.match(new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += matches * (termLower.length > 5 ? 2 : 1); // Longer terms score higher
  }

  return score;
}

/**
 * Extract meaningful terms from a requirements string.
 */
function extractQueryTerms(requirements: string): string[] {
  const domainTerms = [
    'authentication', 'auth', 'login', 'oauth', 'jwt', 'session',
    'payment', 'stripe', 'billing', 'checkout', 'subscription',
    'realtime', 'real-time', 'websocket', 'chat', 'notification', 'live',
    'cache', 'redis', 'performance', 'fast', 'speed',
    'scale', 'scaling', 'million', 'users', 'high traffic', 'load',
    'database', 'postgres', 'mongodb', 'mysql', 'sql',
    'microservice', 'monolith', 'service',
    'queue', 'kafka', 'rabbitmq', 'async', 'background',
    'security', 'encryption', 'authorization', 'rbac', 'roles',
    'api', 'rest', 'graphql', 'webhook',
    'storage', 'file', 'upload', 's3', 'cdn',
    'search', 'elasticsearch',
    'monitoring', 'logging', 'observability',
    'deploy', 'docker', 'kubernetes', 'cloud', 'aws',
    'ecommerce', 'marketplace', 'shop', 'product', 'order', 'inventory',
    'social', 'feed', 'post', 'comment', 'like', 'follow',
    'healthcare', 'medical', 'patient', 'hipaa',
    'fintech', 'banking', 'finance', 'transaction',
    'delivery', 'tracking', 'location',
    'collaboration', 'document', 'editor',
  ];

  const reqLower = requirements.toLowerCase();
  const found: string[] = [];

  // Extract matching domain terms
  for (const term of domainTerms) {
    if (reqLower.includes(term)) {
      found.push(term);
    }
  }

  // Also extract words > 5 chars as general terms
  const words = requirements.split(/\W+/).filter((w) => w.length > 5);
  found.push(...words);

  return [...new Set(found)];
}

/**
 * Retrieve the top-k most relevant knowledge chunks for the given requirements.
 */
export function retrieve(requirements: string, topK = 5): RetrievalResult[] {
  const allChunks = getIndexedChunks();
  const queryTerms = extractQueryTerms(requirements);

  if (queryTerms.length === 0) {
    // Return diverse sample if no terms extracted
    return allChunks.slice(0, topK).map((item) => ({ ...item, score: 1 }));
  }

  const scored = allChunks.map((item) => ({
    ...item,
    score: scoreChunk(item.chunk.content, queryTerms, item.document.category),
  }));

  // Sort by score descending, then deduplicate by document (keep best chunk per doc)
  scored.sort((a, b) => b.score - a.score);

  const seenDocs = new Set<string>();
  const results: RetrievalResult[] = [];

  for (const item of scored) {
    if (results.length >= topK) break;
    if (item.score === 0) break;
    // Allow multiple chunks from same doc only if very high score
    if (!seenDocs.has(item.document.id) || item.score > 5) {
      seenDocs.add(item.document.id);
      results.push(item);
    }
  }

  return results;
}

/**
 * Build a context string from retrieved results for injection into the LLM prompt.
 */
export function buildRetrievedContext(requirements: string): string {
  const results = retrieve(requirements, 3);

  if (results.length === 0) {
    return '';
  }

  const contextParts = results.map((r) => {
    // Truncate chunk content to 300 chars max for fast local CPU context processing
    const snippet = r.chunk.content.length > 300 ? r.chunk.content.slice(0, 300) + '...' : r.chunk.content;
    return `### ${r.document.title}\n${snippet}`;
  });

  return `## Architectural Guidance\n${contextParts.join('\n\n')}`;
}

/** Reset cache (useful for testing) */
export function resetCache() {
  cachedDocuments = null;
  cachedChunks = null;
}
