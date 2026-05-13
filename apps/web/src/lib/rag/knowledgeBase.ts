export type KnowledgeDocumentInput = {
  organizationId: string;
  title: string;
  content: string;
  sourceType?: "faq" | "document" | "service" | "policy" | "website" | "note";
};

export type KnowledgeChunkInput = {
  organizationId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
};

export function chunkKnowledgeContent(content: string, maxCharacters = 1200): string[] {
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharacters && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [content.trim()].filter(Boolean);
}

export function estimateTokenCount(content: string) {
  return Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.3);
}

export function prepareKnowledgeChunks(input: KnowledgeDocumentInput, documentId: string): KnowledgeChunkInput[] {
  return chunkKnowledgeContent(input.content).map((chunk, index) => ({
    organizationId: input.organizationId,
    documentId,
    chunkIndex: index,
    content: chunk,
    tokenCount: estimateTokenCount(chunk),
  }));
}

export function buildRagAnswerInstruction(snippets: { title?: string; content: string }[]) {
  if (!snippets.length) return "No organization-approved knowledge was found. Say you cannot confirm and offer human handoff.";
  return `Use only these organization-approved snippets when answering:\n${snippets.map((snippet, index) => `[${index + 1}] ${snippet.title ? `${snippet.title}: ` : ""}${snippet.content}`).join("\n")}`;
}
