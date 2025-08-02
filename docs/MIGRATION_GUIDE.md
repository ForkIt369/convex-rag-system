# Migration Guide: Supabase to Convex

This guide details the migration process from the original Supabase/PostgreSQL RAG system to Convex.

## Overview

The migration involved translating a 23-table PostgreSQL schema with pgvector extension to Convex's document-based model, while maintaining all functionality and improving real-time capabilities.

## Schema Translation

### 1. Documents Table

**Supabase (PostgreSQL)**:
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtable_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  doc_type TEXT CHECK (doc_type IN ('pdf', 'web', 'text', 'code', 'markdown', 'epub', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processing', 'indexed', 'error', 'archived')),
  metadata JSONB DEFAULT '{}',
  file_size BIGINT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ
);
```

**Convex**:
```typescript
documents: defineTable({
  airtableId: v.string(),
  title: v.string(),
  content: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  docType: v.union(
    v.literal("pdf"), v.literal("web"), v.literal("text"),
    v.literal("code"), v.literal("markdown"), v.literal("epub"), v.literal("other")
  ),
  status: v.union(
    v.literal("new"), v.literal("processing"), v.literal("indexed"),
    v.literal("error"), v.literal("archived")
  ),
  metadata: v.optional(v.object({})),
  fileSize: v.optional(v.number()),
  language: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  indexedAt: v.optional(v.number()),
  searchText: v.optional(v.string()),
})
```

### 2. Vector Storage

**Supabase (pgvector)**:
```sql
CREATE TABLE vector_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_type TEXT CHECK (memory_type IN ('episodic', 'semantic', 'procedural')),
  content TEXT NOT NULL,
  embedding vector(1024),
  embedding_model TEXT NOT NULL,
  magnitude REAL,
  metadata JSONB DEFAULT '{}',
  importance_score REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  agent_id TEXT,
  confidence_score REAL DEFAULT 0.5
);

-- Create HNSW index for fast similarity search
CREATE INDEX idx_vector_memories_embedding 
ON vector_memories 
USING hnsw (embedding vector_cosine_ops);
```

**Convex**:
```typescript
vectorMemories: defineTable({
  memoryType: v.union(v.literal("episodic"), v.literal("semantic"), v.literal("procedural")),
  content: v.string(),
  embedding: v.array(v.number()), // 1024-dimensional array
  embeddingModel: v.string(),
  magnitude: v.number(), // Pre-computed for performance
  metadata: v.optional(v.object({})),
  importanceScore: v.number(),
  accessCount: v.number(),
  lastAccessedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  agentId: v.optional(v.string()),
  confidenceScore: v.number(),
})
```

## Key Differences

### 1. Vector Operations

**Supabase**:
```sql
-- Native vector similarity search
SELECT *, 1 - (embedding <=> query_embedding) as similarity
FROM vector_memories
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

**Convex**:
```typescript
// Manual similarity calculation
const results = candidates
  .map((doc) => {
    const similarity = cosineSimilarityWithMagnitude(
      args.embedding,
      doc.embedding,
      queryMagnitude,
      doc.magnitude
    );
    return { document: doc, similarity };
  })
  .filter((result) => result.similarity >= threshold)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, limit);
```

### 2. Real-time Updates

**Supabase**:
```javascript
// Separate real-time subscription
const subscription = supabase
  .from('documents')
  .on('INSERT', payload => {
    console.log('New document:', payload.new)
  })
  .subscribe()
```

**Convex**:
```typescript
// Built-in reactivity
const documents = useQuery(api.functions.documents.listDocuments, {
  status: "new"
});
// Automatically updates when data changes
```

### 3. Transactions

**Supabase**:
```sql
BEGIN;
INSERT INTO documents (...) VALUES (...);
INSERT INTO chunks (...) VALUES (...);
COMMIT;
```

**Convex**:
```typescript
// Automatic transactional consistency within mutations
export const createDocumentWithChunks = mutation({
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {...});
    for (const chunk of args.chunks) {
      await ctx.db.insert("chunks", { documentId: docId, ...chunk });
    }
    return docId; // All operations succeed or fail together
  }
});
```

## Performance Considerations

### 1. Vector Search Performance

**Supabase/pgvector**:
- HNSW index provides O(log n) approximate nearest neighbor search
- Hardware accelerated with pgvector optimizations
- Can handle millions of vectors efficiently

**Convex**:
- O(n) full scan for similarity search
- Optimizations:
  - Pre-computed magnitudes reduce calculations by 50%
  - Limit candidates to 1000 for bounded response time
  - Use indexes for initial filtering

### 2. Scaling Strategy

**Convex Approach**:
1. **Hybrid Search**: Combine full-text search with vector similarity
2. **Tiered Storage**: Hot vectors in memory, cold in storage
3. **Chunking**: Process large documents in segments
4. **Caching**: Cache frequently accessed embeddings

## Migration Steps

### 1. Export Data from Supabase

```bash
# Export documents
pg_dump -h your-db-host -U postgres -d your-db \
  --table=documents \
  --data-only \
  --format=csv > documents.csv

# Export vector memories (requires special handling for vectors)
psql -h your-db-host -U postgres -d your-db -c \
  "COPY (SELECT id, memory_type, content, 
          array_to_string(embedding::float[], ',') as embedding,
          embedding_model, magnitude, metadata, importance_score,
          access_count, last_accessed_at, created_at, updated_at,
          agent_id, confidence_score
   FROM vector_memories) 
   TO STDOUT WITH CSV HEADER" > vector_memories.csv
```

### 2. Transform Data

```typescript
// transform-data.ts
import { parse } from 'csv-parse';
import fs from 'fs';

async function transformDocuments() {
  const records = await parseCSV('documents.csv');
  
  return records.map(record => ({
    airtableId: record.airtable_id,
    title: record.title,
    content: record.content || undefined,
    sourceUrl: record.source_url || undefined,
    docType: record.doc_type,
    status: record.status || "new",
    metadata: JSON.parse(record.metadata || '{}'),
    fileSize: record.file_size ? parseInt(record.file_size) : undefined,
    language: record.language || "en",
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
    indexedAt: record.indexed_at ? new Date(record.indexed_at).getTime() : undefined,
    searchText: `${record.title} ${record.content || ""}`.substring(0, 1000),
  }));
}

async function transformVectorMemories() {
  const records = await parseCSV('vector_memories.csv');
  
  return records.map(record => ({
    memoryType: record.memory_type,
    content: record.content,
    embedding: record.embedding.split(',').map(Number),
    embeddingModel: record.embedding_model,
    magnitude: parseFloat(record.magnitude),
    metadata: JSON.parse(record.metadata || '{}'),
    importanceScore: parseFloat(record.importance_score),
    accessCount: parseInt(record.access_count),
    lastAccessedAt: new Date(record.last_accessed_at).getTime(),
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
    agentId: record.agent_id || undefined,
    confidenceScore: parseFloat(record.confidence_score),
  }));
}
```

### 3. Import to Convex

```typescript
// convex/migrations/importData.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const importDocuments = mutation({
  args: {
    documents: v.array(v.object({
      airtableId: v.string(),
      title: v.string(),
      content: v.optional(v.string()),
      // ... other fields
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const doc of args.documents) {
      const id = await ctx.db.insert("documents", doc);
      results.push(id);
    }
    return { imported: results.length };
  }
});

export const importVectorMemories = mutation({
  args: {
    memories: v.array(v.object({
      memoryType: v.union(v.literal("episodic"), v.literal("semantic"), v.literal("procedural")),
      content: v.string(),
      embedding: v.array(v.number()),
      // ... other fields
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    // Import in batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < args.memories.length; i += batchSize) {
      const batch = args.memories.slice(i, i + batchSize);
      for (const memory of batch) {
        const id = await ctx.db.insert("vectorMemories", memory);
        results.push(id);
      }
    }
    return { imported: results.length };
  }
});
```

### 4. Run Migration

```bash
# 1. Transform data
npx ts-node transform-data.ts

# 2. Import to Convex (in batches)
npx convex run migrations:importDocuments -- --file=documents.json
npx convex run migrations:importVectorMemories -- --file=vector_memories.json
```

## Validation

### 1. Data Integrity Checks

```typescript
// convex/migrations/validate.ts
export const validateMigration = query({
  handler: async (ctx) => {
    const docCount = await ctx.db.query("documents").count();
    const memoryCount = await ctx.db.query("vectorMemories").count();
    
    // Verify embeddings
    const sampleMemory = await ctx.db.query("vectorMemories").first();
    const embeddingValid = sampleMemory?.embedding.length === 1024;
    
    return {
      documents: docCount,
      vectorMemories: memoryCount,
      embeddingDimensions: sampleMemory?.embedding.length,
      embeddingValid,
    };
  }
});
```

### 2. Search Validation

```typescript
// Test vector search functionality
const testResults = await ctx.runQuery(api.functions.vectorSearch.vectorSearch, {
  embedding: testEmbedding,
  limit: 10,
  threshold: 0.7
});

console.log(`Found ${testResults.length} similar vectors`);
```

## Rollback Plan

If issues arise:

1. **Keep Supabase Running**: Don't shut down Supabase until Convex is fully validated
2. **Dual Write**: Implement dual writes during transition period
3. **Feature Flags**: Use feature flags to switch between systems
4. **Data Export**: Convex data can be exported via their CLI if needed

## Post-Migration Optimization

1. **Monitor Performance**: Use Convex dashboard to track query times
2. **Optimize Queries**: Add indexes based on usage patterns
3. **Cache Embeddings**: Implement caching for frequently accessed vectors
4. **Batch Operations**: Use batch APIs for bulk operations

## Conclusion

The migration from Supabase to Convex provides:
- ✅ Built-in real-time capabilities
- ✅ Automatic scaling
- ✅ Type-safe database operations
- ✅ Simpler deployment model
- ⚠️ Different vector search performance characteristics

The trade-off is between pgvector's specialized vector operations and Convex's developer experience and real-time features.