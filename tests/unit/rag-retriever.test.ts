import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../../backend/src/modules/rag/KnowledgeLoader.js';
import { chunkDocument } from '../../backend/src/modules/rag/DocumentChunker.js';
import { retrieve, buildRetrievedContext } from '../../backend/src/modules/rag/Retriever.js';

describe('RAG Pipeline', () => {
  it('loads knowledge base markdown documents', () => {
    const docs = loadKnowledgeBase();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.id.includes('postgresql'))).toBe(true);
    expect(docs.some((d) => d.id.includes('authentication'))).toBe(true);
  });

  it('chunks documents into markdown sections', () => {
    const content = `# Title\n\nSection 1 text.\n\n## Section 2\n\nSection 2 text.`;
    const chunks = chunkDocument('test-doc', content);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].documentId).toBe('test-doc');
  });

  it('retrieves relevant knowledge for payment and database requirements', () => {
    const reqs = 'I want an e-commerce platform with Stripe payment processing and PostgreSQL database.';
    const results = retrieve(reqs, 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.chunk.content.toLowerCase().includes('payment') || r.document.id.includes('payment') || r.document.id.includes('postgres'))).toBe(true);
  });

  it('builds a retrieved context string for LLM prompt', () => {
    const reqs = 'Need a real-time chat app with WebSockets and Redis caching.';
    const context = buildRetrievedContext(reqs);
    expect(context).toContain('Architectural Guidance');
  });
});
