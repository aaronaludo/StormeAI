# RAG Knowledge Base

ST-006 adds the frontend-safe RAG preparation utilities.

## Includes

- paragraph-aware content chunking
- token count estimation
- chunk preparation for `knowledge_chunks`
- answer instruction builder for retrieved snippets

## Supabase tables from ST-001

- `knowledge_documents`
- `knowledge_chunks`
- `match_knowledge_chunks(...)`

## Next

- Add embedding generation in Supabase Edge Functions
- Store embeddings in pgvector
- Use retrieved snippets in the agent prompt
