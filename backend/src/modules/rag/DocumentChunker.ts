export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
}

/**
 * Splits a knowledge document into overlapping chunks for retrieval.
 * Uses markdown section boundaries as natural split points.
 */
export function chunkDocument(documentId: string, content: string, maxChunkSize = 600, overlap = 100): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Split on markdown headers as natural boundaries
  const sections = content.split(/\n(?=#{1,3}\s)/).filter((s) => s.trim().length > 0);

  let chunkIndex = 0;
  let buffer = '';

  for (const section of sections) {
    if ((buffer + '\n' + section).length > maxChunkSize && buffer.length > 0) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        content: buffer.trim(),
        index: chunkIndex,
      });
      // Overlap: keep last `overlap` chars of buffer for context
      buffer = buffer.slice(-overlap) + '\n' + section;
      chunkIndex++;
    } else {
      buffer = buffer ? buffer + '\n' + section : section;
    }
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      content: buffer.trim(),
      index: chunkIndex,
    });
  }

  return chunks;
}
