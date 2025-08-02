# Voyage AI Integration Guide

## Overview

This document outlines the integration of Voyage AI embeddings into the Convex RAG system, focusing on the voyage-3.5 model with 1024 dimensions.

## Voyage AI Models

### Selected Model: voyage-3.5
- **Dimensions**: 1024
- **Context Length**: 16,000 tokens
- **Strengths**: Balanced performance and dimension size
- **Use Case**: General-purpose document embeddings

### Alternative Models
- **voyage-3**: 1024 dimensions, previous generation
- **voyage-large-2**: 1536 dimensions, higher accuracy
- **voyage-code-2**: 1536 dimensions, optimized for code
- **voyage-lite-02-instruct**: 1024 dimensions, instruction-following

## Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Document/Text  │────►│ Convex Action   │────►│  Voyage AI API  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Error Handling  │     │ Embedding Vector │
                        │ & Retry Logic   │     │   (1024 dims)    │
                        └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Cache Check &   │     │ Vector Storage  │
                        │ Deduplication   │     │   in Convex     │
                        └─────────────────┘     └─────────────────┘
```

## Implementation Details

### 1. API Configuration

```typescript
// convex/lib/voyageai.ts
export const VOYAGE_CONFIG = {
  apiKey: process.env.VOYAGE_AI_API_KEY!,
  baseUrl: "https://api.voyageai.com/v1",
  model: "voyage-3.5",
  dimensions: 1024,
  maxBatchSize: 128,
  maxRetries: 3,
  retryDelay: 1000, // ms
};
```

### 2. Embedding Generation Action

```typescript
// convex/actions/embeddings.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateEmbedding = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check cache first
    const cached = await checkEmbeddingCache(args.text);
    if (cached) return cached;

    // Call Voyage AI
    const embedding = await callVoyageAPI(args.text, args.model);
    
    // Store in cache
    await storeEmbeddingCache(args.text, embedding);
    
    return embedding;
  },
});

export const batchGenerateEmbeddings = action({
  args: {
    texts: v.array(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Voyage AI supports batch embeddings
    const embeddings = await callVoyageAPIBatch(args.texts, args.model);
    return embeddings;
  },
});
```

### 3. API Client Implementation

```typescript
// convex/lib/voyageai-client.ts
import { VOYAGE_CONFIG } from "./voyageai";

interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export async function callVoyageAPI(
  text: string,
  model: string = VOYAGE_CONFIG.model
): Promise<number[]> {
  const response = await fetch(`${VOYAGE_CONFIG.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOYAGE_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage AI API error: ${response.statusText}`);
  }

  const data: VoyageEmbeddingResponse = await response.json();
  return data.data[0].embedding;
}

export async function callVoyageAPIBatch(
  texts: string[],
  model: string = VOYAGE_CONFIG.model
): Promise<number[][]> {
  // Split into batches if needed
  const batches = chunkArray(texts, VOYAGE_CONFIG.maxBatchSize);
  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const response = await fetch(`${VOYAGE_CONFIG.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOYAGE_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: model,
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage AI API error: ${response.statusText}`);
    }

    const data: VoyageEmbeddingResponse = await response.json();
    const embeddings = data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
    
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
```

### 4. Caching Strategy

```typescript
// convex/lib/embedding-cache.ts
import { Doc } from "./_generated/dataModel";
import crypto from "crypto";

export function generateEmbeddingHash(text: string, model: string): string {
  return crypto
    .createHash("sha256")
    .update(`${model}:${text}`)
    .digest("hex");
}

export async function checkEmbeddingCache(
  ctx: any,
  text: string,
  model: string = VOYAGE_CONFIG.model
): Promise<number[] | null> {
  const hash = generateEmbeddingHash(text, model);
  
  // Check in-memory cache first (if available)
  const cached = await ctx.db
    .query("embeddingCache")
    .withIndex("by_hash", (q) => q.eq("hash", hash))
    .first();
    
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embedding;
  }
  
  return null;
}
```

### 5. Error Handling & Retry

```typescript
// convex/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delay: number;
    backoff?: number;
  }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < options.maxRetries - 1) {
        const delay = options.delay * Math.pow(options.backoff || 1, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
```

## Usage Patterns

### 1. Document Processing

```typescript
// Process a new document
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.runQuery(getDocument, { id: args.documentId });
    const chunks = await chunkDocument(document.content);
    
    // Generate embeddings for all chunks
    const embeddings = await batchGenerateEmbeddings({
      texts: chunks.map(c => c.content),
    });
    
    // Store chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await ctx.runMutation(storeChunk, {
        documentId: args.documentId,
        content: chunks[i].content,
        embedding: embeddings[i],
        magnitude: calculateMagnitude(embeddings[i]),
      });
    }
  },
});
```

### 2. Query Processing

```typescript
// Process a search query
export const searchDocuments = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding({ text: args.query });
    
    // Search for similar documents
    const results = await ctx.runQuery(vectorSearch, {
      embedding: queryEmbedding,
      limit: args.limit || 10,
      threshold: args.threshold || 0.7,
    });
    
    return results;
  },
});
```

## Cost Optimization

### 1. Embedding Deduplication
- Hash text content before embedding
- Check cache before API calls
- Store embeddings for reuse

### 2. Batch Processing
- Group embedding requests
- Use batch API endpoints
- Process during off-peak hours

### 3. Model Selection
- Use voyage-3.5 for general content
- Consider voyage-lite for less critical content
- Reserve voyage-large for high-precision needs

## Monitoring & Analytics

### 1. Usage Tracking
```typescript
interface EmbeddingUsage {
  date: string;
  model: string;
  tokenCount: number;
  requestCount: number;
  cacheHitRate: number;
  averageLatency: number;
}
```

### 2. Performance Metrics
- API response time
- Embedding generation throughput
- Cache hit rate
- Error rate

### 3. Cost Tracking
- Tokens consumed per day
- Cost per document
- Cost per query

## Best Practices

### 1. Text Preprocessing
- Remove excessive whitespace
- Normalize Unicode characters
- Limit text length to context window
- Handle special characters properly

### 2. Dimension Validation
```typescript
export function validateEmbedding(embedding: number[], expectedDims: number = 1024): boolean {
  return embedding.length === expectedDims && 
         embedding.every(val => typeof val === 'number' && !isNaN(val));
}
```

### 3. Security
- Store API keys securely
- Implement rate limiting
- Monitor for unusual usage
- Rotate keys periodically

## Migration from Other Models

### From OpenAI to Voyage AI
1. Dimension difference: OpenAI (1536) vs Voyage (1024)
2. No direct vector conversion possible
3. Requires re-embedding all content

### Migration Strategy
1. Set up parallel embedding generation
2. Gradually migrate by document age
3. Maintain compatibility layer
4. Monitor quality metrics

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Error: 429 Too Many Requests
   - Solution: Implement exponential backoff

2. **Token Limits**
   - Error: Text exceeds context window
   - Solution: Chunk text before embedding

3. **Dimension Mismatch**
   - Error: Vector dimension mismatch
   - Solution: Validate model selection

### Debug Logging
```typescript
export function logEmbeddingOperation(
  operation: string,
  details: any,
  success: boolean,
  error?: Error
) {
  console.log({
    timestamp: new Date().toISOString(),
    operation,
    success,
    error: error?.message,
    ...details,
  });
}
```

## Future Enhancements

1. **Multi-Model Support**
   - Dynamic model selection
   - Model performance comparison
   - A/B testing framework

2. **Advanced Caching**
   - Distributed cache
   - Semantic deduplication
   - Compression strategies

3. **Fine-Tuning Integration**
   - Custom model support
   - Domain-specific embeddings
   - Continuous improvement pipeline