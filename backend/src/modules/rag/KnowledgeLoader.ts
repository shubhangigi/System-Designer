import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve knowledge base relative to repo root
const KNOWLEDGE_DIR = path.resolve(__dirname, '../../../../knowledge');

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  path: string;
}

export function loadKnowledgeBase(): KnowledgeDocument[] {
  const documents: KnowledgeDocument[] = [];

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.warn('[RAG] Knowledge directory not found:', KNOWLEDGE_DIR);
    return documents;
  }

  function walkDir(dir: string, category: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, entry.name);
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : entry.name.replace('.md', '');
        const id = `${category}/${entry.name.replace('.md', '')}`;
        documents.push({ id, title, category, content, path: fullPath });
      }
    }
  }

  walkDir(KNOWLEDGE_DIR);
  console.log(`[RAG] Loaded ${documents.length} knowledge documents`);
  return documents;
}
