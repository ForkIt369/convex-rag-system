# API Reference

Complete API documentation for the Convex RAG System.

## Table of Contents

- [Documents API](#documents-api)
- [Embeddings API](#embeddings-api)
- [Vector Search API](#vector-search-api)
- [Memory Management API](#memory-management-api)
- [Knowledge Graph API](#knowledge-graph-api)
- [Agent API](#agent-api)
- [Conversation API](#conversation-api)

## Documents API

### `functions.documents.createDocument`

Creates a new document in the system.

**Type**: `mutation`

**Arguments**:
```typescript
{
  airtableId: string;        // Unique identifier from Airtable
  title: string;             // Document title
  content?: string;          // Document content (optional)
  sourceUrl?: string;        // Source URL (optional)
  docType: "pdf" | "web" | "text" | "code" | "markdown" | "epub" | "other";
  metadata?: object;         // Additional metadata (optional)
  fileSize?: number;         // File size in bytes (optional)
  language?: string;         // Language code (default: "en")
}
```

**Returns**: `Id<"documents">`

**Example**:
```typescript
const docId = await ctx.runMutation(api.functions.documents.createDocument, {
  airtableId: "rec123456",
  title: "Introduction to RAG Systems",
  content: "Retrieval-Augmented Generation combines...",
  docType: "text",
  metadata: { category: "tutorial", difficulty: "beginner" }
});
```

### `functions.documents.getDocument`

Retrieves a document by ID.

**Type**: `query`

**Arguments**:
```typescript
{
  id: Id<"documents">;       // Document ID
}
```

**Returns**: `Doc<"documents"> | null`

**Example**:
```typescript
const document = await ctx.runQuery(api.functions.documents.getDocument, {
  id: docId
});
```

### `functions.documents.listDocuments`

Lists documents with pagination and filtering.

**Type**: `query`

**Arguments**:
```typescript
{
  limit?: number;            // Number of results (default: 10)
  cursor?: string;           // Pagination cursor
  status?: "new" | "processing" | "indexed" | "error" | "archived";
}
```

**Returns**:
```typescript
{
  documents: Doc<"documents">[];
  nextCursor: string | null;
}
```

**Example**:
```typescript
const { documents, nextCursor } = await ctx.runQuery(
  api.functions.documents.listDocuments,
  { limit: 20, status: "indexed" }
);
```

### `functions.documents.updateDocumentStatus`

Updates the status of a document.

**Type**: `mutation`

**Arguments**:
```typescript
{
  id: Id<"documents">;
  status: "new" | "processing" | "indexed" | "error" | "archived";
}
```

**Returns**: `void`

### `functions.documents.searchDocuments`

Full-text search across documents.

**Type**: `query`

**Arguments**:
```typescript
{
  query: string;             // Search query
  limit?: number;            // Max results (default: 10)
}
```

**Returns**: `Doc<"documents">[]`

**Example**:
```typescript
const results = await ctx.runQuery(api.functions.documents.searchDocuments, {
  query: "machine learning embeddings",
  limit: 5
});
```

## Embeddings API

### `actions.embeddings.generateEmbedding`

Generates an embedding for a single text using Voyage AI.

**Type**: `action`

**Arguments**:
```typescript
{
  text: string;              // Text to embed
  model?: string;            // Model name (default: "voyage-3.5")
}
```

**Returns**:
```typescript
{
  embedding: number[];       // 1024-dimensional vector
  model: string;            // Model used
  dimensions: number;       // Vector dimensions (1024)
  magnitude: number;        // Pre-computed magnitude
}
```

**Example**:
```typescript
const result = await ctx.runAction(api.actions.embeddings.generateEmbedding, {
  text: "What is retrieval augmented generation?"
});
console.log(`Generated ${result.dimensions}D embedding with magnitude ${result.magnitude}`);
```

### `actions.embeddings.batchGenerateEmbeddings`

Generates embeddings for multiple texts in a single API call.

**Type**: `action`

**Arguments**:
```typescript
{
  texts: string[];           // Array of texts to embed
  model?: string;            // Model name (default: "voyage-3.5")
}
```

**Returns**:
```typescript
Array<{
  embedding: number[];
  model: string;
  dimensions: number;
  magnitude: number;
}>
```

**Example**:
```typescript
const embeddings = await ctx.runAction(api.actions.embeddings.batchGenerateEmbeddings, {
  texts: [
    "Machine learning fundamentals",
    "Deep learning architectures",
    "Natural language processing"
  ]
});
```

## Vector Search API

### `functions.vectorSearch.storeVectorMemory`

Stores a vector memory with its embedding.

**Type**: `mutation`

**Arguments**:
```typescript
{
  memoryType: "episodic" | "semantic" | "procedural";
  content: string;           // Memory content
  embedding: number[];       // 1024D embedding vector
  embeddingModel: string;    // Model used for embedding
  magnitude: number;         // Vector magnitude
  metadata?: object;         // Additional metadata
  importanceScore?: number;  // Importance (0-1, default: 0.5)
  agentId?: string;         // Associated agent ID
}
```

**Returns**: `Id<"vectorMemories">`

**Example**:
```typescript
const memoryId = await ctx.runMutation(api.functions.vectorSearch.storeVectorMemory, {
  memoryType: "semantic",
  content: "RAG systems combine retrieval with generation",
  embedding: embeddingResult.embedding,
  embeddingModel: "voyage-3.5",
  magnitude: embeddingResult.magnitude,
  metadata: { source: "tutorial", topic: "rag" }
});
```

### `functions.vectorSearch.vectorSearch`

Performs similarity search across vector memories.

**Type**: `query`

**Arguments**:
```typescript
{
  embedding: number[];       // Query embedding
  memoryType?: "episodic" | "semantic" | "procedural";
  limit?: number;           // Max results (default: 10)
  threshold?: number;       // Similarity threshold (default: 0.7)
  agentId?: string;        // Filter by agent
}
```

**Returns**:
```typescript
Array<{
  document: Doc<"vectorMemories">;
  similarity: number;        // Cosine similarity (0-1)
  documentId: Id<"vectorMemories">;
}>
```

**Example**:
```typescript
const queryEmbedding = await ctx.runAction(api.actions.embeddings.generateEmbedding, {
  text: "How do embeddings work?"
});

const results = await ctx.runQuery(api.functions.vectorSearch.vectorSearch, {
  embedding: queryEmbedding.embedding,
  memoryType: "semantic",
  limit: 5,
  threshold: 0.6
});

results.forEach(r => {
  console.log(`Similarity: ${r.similarity.toFixed(3)} - ${r.document.content}`);
});
```

### `functions.vectorSearch.updateAccessCounts`

Updates access counts for retrieved memories.

**Type**: `mutation`

**Arguments**:
```typescript
{
  memoryIds: Id<"vectorMemories">[];
}
```

**Returns**: `void`

### `functions.vectorSearch.searchChunks`

Searches document chunks by vector similarity.

**Type**: `query`

**Arguments**:
```typescript
{
  embedding: number[];       // Query embedding
  limit?: number;           // Max results (default: 10)
  threshold?: number;       // Similarity threshold (default: 0.7)
}
```

**Returns**:
```typescript
Array<{
  chunk: Doc<"chunks">;
  similarity: number;
  document: Doc<"documents"> | null;
}>
```

## Memory Management API

### `functions.memories.createMemory`

Creates a general memory entry.

**Type**: `mutation`

**Arguments**:
```typescript
{
  content: string;
  type: "episodic" | "semantic" | "procedural";
  metadata?: object;
  agentId?: string;
  confidence?: number;      // Confidence score (0-1)
  importance?: number;      // Importance score (0-1)
}
```

**Returns**: `Id<"memories">`

### `functions.memories.consolidateMemories`

Consolidates and optimizes memory storage.

**Type**: `mutation`

**Arguments**:
```typescript
{
  agentId?: string;         // Filter by agent
  beforeDate?: number;      // Consolidate memories before timestamp
  minImportance?: number;   // Minimum importance threshold
}
```

**Returns**:
```typescript
{
  consolidated: number;     // Number of memories consolidated
  removed: number;         // Number of memories removed
}
```

## Knowledge Graph API

### `functions.knowledge.createEntity`

Creates a knowledge entity.

**Type**: `mutation`

**Arguments**:
```typescript
{
  name: string;
  type: string;            // Entity type (person, place, concept, etc.)
  properties?: object;     // Entity properties
  embedding?: number[];    // Optional embedding
}
```

**Returns**: `Id<"knowledgeEntities">`

### `functions.knowledge.createRelationship`

Creates a relationship between entities.

**Type**: `mutation`

**Arguments**:
```typescript
{
  sourceId: Id<"knowledgeEntities">;
  targetId: Id<"knowledgeEntities">;
  relationshipType: string;
  properties?: object;
  strength?: number;       // Relationship strength (0-1)
}
```

**Returns**: `Id<"knowledgeRelationships">`

### `functions.knowledge.queryGraph`

Queries the knowledge graph.

**Type**: `query`

**Arguments**:
```typescript
{
  entityId?: Id<"knowledgeEntities">;
  relationshipType?: string;
  depth?: number;          // Traversal depth (default: 1)
  limit?: number;         // Max results per level
}
```

**Returns**:
```typescript
{
  entities: Doc<"knowledgeEntities">[];
  relationships: Doc<"knowledgeRelationships">[];
}
```

## Agent API

### `functions.agents.createAgent`

Creates an AI agent with specific capabilities.

**Type**: `mutation`

**Arguments**:
```typescript
{
  agentId: string;        // Unique agent identifier
  name: string;
  type: "assistant" | "researcher" | "analyst" | "specialist";
  capabilities: string[]; // List of capabilities
  metadata?: object;
}
```

**Returns**: `Id<"agentStates">`

### `functions.agents.updateAgentState`

Updates an agent's state.

**Type**: `mutation`

**Arguments**:
```typescript
{
  agentId: string;
  state: object;          // New state data
  status?: "active" | "idle" | "busy" | "error";
}
```

**Returns**: `void`

### `functions.agents.getAgentMemories`

Retrieves memories associated with an agent.

**Type**: `query`

**Arguments**:
```typescript
{
  agentId: string;
  memoryType?: "episodic" | "semantic" | "procedural";
  limit?: number;
  includeVectorMemories?: boolean;
}
```

**Returns**:
```typescript
{
  memories: Doc<"agentMemories">[];
  vectorMemories?: Doc<"vectorMemories">[];
}
```

## Conversation API

### `functions.conversations.createConversation`

Creates a new conversation.

**Type**: `mutation`

**Arguments**:
```typescript
{
  title?: string;
  participants?: string[]; // Agent IDs
  metadata?: object;
}
```

**Returns**: `Id<"conversations">`

### `functions.conversations.addMessage`

Adds a message to a conversation.

**Type**: `mutation`

**Arguments**:
```typescript
{
  conversationId: Id<"conversations">;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: object;
  embedding?: number[];   // Optional message embedding
}
```

**Returns**: `Id<"messages">`

### `functions.conversations.getConversationWithMessages`

Retrieves a conversation with its messages.

**Type**: `query`

**Arguments**:
```typescript
{
  conversationId: Id<"conversations">;
  limit?: number;        // Max messages (default: 50)
  beforeTimestamp?: number;
}
```

**Returns**:
```typescript
{
  conversation: Doc<"conversations">;
  messages: Doc<"messages">[];
}
```

## Error Handling

All API functions may throw errors:

```typescript
try {
  const result = await ctx.runAction(api.actions.embeddings.generateEmbedding, {
    text: "Sample text"
  });
} catch (error) {
  if (error.message.includes("VOYAGE_AI_API_KEY")) {
    console.error("Voyage AI API key not configured");
  } else if (error.message.includes("rate limit")) {
    console.error("API rate limit exceeded");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Rate Limits

- **Voyage AI**: 300 requests/minute, 10 requests/second
- **Batch Embeddings**: Max 128 texts per request
- **Vector Search**: Max 1000 candidates scanned per query
- **Document Creation**: No hard limit, but batch for large imports

## Best Practices

1. **Batch Operations**: Use batch APIs when processing multiple items
2. **Caching**: Cache embeddings for frequently accessed content
3. **Error Handling**: Always handle API errors gracefully
4. **Pagination**: Use cursors for large result sets
5. **Filtering**: Use indexes and filters to reduce scan size