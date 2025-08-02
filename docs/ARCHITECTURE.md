# Convex RAG System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONVEX RAG SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Client Layer      │     │    API Layer        │     │  External APIs  │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ • React Components  │────►│ • Convex Functions  │────►│ • Voyage AI     │
│ • Real-time Hooks   │◄────│ • HTTP Actions      │◄────│ • Web Scrapers  │
│ • Type Safety       │     │ • Validators        │     │ • PDF Parsers   │
└─────────────────────┘     └─────────────────────┘     └─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONVEX DATABASE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Documents  │  │   Chunks    │  │ Embeddings  │  │   Queries   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Vector    │  │  Episodic   │  │  Semantic   │  │ Procedural  │   │
│  │  Memories   │  │  Memories   │  │  Memories   │  │  Memories   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Knowledge   │  │ Knowledge   │  │  Business   │  │   Pattern   │   │
│  │   Nodes     │  │   Edges     │  │  Patterns   │  │Effectiveness│   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Schema-First Development
- Type-safe schema definitions using Convex's schema system
- Automatic TypeScript type generation
- Runtime validation

### 2. Vector Storage Strategy
Since Convex doesn't have native vector types like PostgreSQL's pgvector:
- Store embeddings as number arrays
- Implement custom vector similarity functions
- Use indexed fields for pre-filtering
- Maintain separate dimension tracking

### 3. Memory System Architecture

#### Hierarchical Memory Model
```
Working Memory (Ephemeral)
    ↓
Vector Memories (Base Layer)
    ↓
┌─────────┬──────────┬────────────┐
│Episodic │Semantic  │Procedural  │
│Memories │Memories  │Memories    │
└─────────┴──────────┴────────────┘
```

#### Memory Types
- **Working Memory**: Short-term, session-based storage with TTL
- **Vector Memories**: Base embedding storage with metadata
- **Episodic**: Event-based memories with temporal context
- **Semantic**: Concept and knowledge representations
- **Procedural**: Skills and process definitions

### 4. Document Processing Pipeline

```
Document Input
    ↓
Type Detection & Validation
    ↓
Content Extraction
    ↓
Intelligent Chunking
    ↓
Embedding Generation (Voyage AI)
    ↓
Vector Storage & Indexing
    ↓
Knowledge Graph Update
```

### 5. Search Architecture

#### Hybrid Search Strategy
1. **Vector Similarity Search**
   - Cosine similarity computation
   - Pre-filtering by metadata
   - Dynamic threshold adjustment

2. **Full-Text Search**
   - Convex text search indexes
   - Token-based matching
   - Relevance scoring

3. **Knowledge Graph Traversal**
   - Relationship-based discovery
   - Concept expansion
   - Pattern matching

### 6. Agent Intelligence Layer

```
┌─────────────────────────────────┐
│      Agent Orchestrator         │
├─────────────────────────────────┤
│ • Session Management            │
│ • Context Maintenance           │
│ • Pattern Recognition           │
│ • Effectiveness Tracking        │
└─────────────────────────────────┘
         ↓              ↓
┌──────────────┐  ┌──────────────┐
│ Business     │  │ Learning     │
│ Pattern      │  │ Optimization │
│ Matcher      │  │ Engine       │
└──────────────┘  └──────────────┘
```

## Implementation Strategies

### 1. Vector Operations in Convex

```typescript
// Since Convex doesn't have native vector operations
export const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};
```

### 2. Efficient Vector Search

```typescript
// Pre-compute and store magnitude for efficiency
interface VectorRecord {
  embedding: number[];
  magnitude: number;
  // ... other fields
}

// Use batching for large-scale searches
export const batchVectorSearch = action({
  args: {
    queryEmbedding: v.array(v.number()),
    limit: v.number(),
    threshold: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation using parallel processing
  },
});
```

### 3. Indexing Strategy

- **Primary Indexes**: Document status, timestamps
- **Secondary Indexes**: Agent IDs, memory types
- **Composite Indexes**: Multi-field queries
- **Text Indexes**: Full-text search on content

### 4. Caching Layer

```
┌─────────────────┐
│  Client Cache   │ (React Query / SWR)
└────────┬────────┘
         │
┌────────▼────────┐
│  Convex Cache   │ (Built-in caching)
└────────┬────────┘
         │
┌────────▼────────┐
│ Embedding Cache │ (Prevent redundant API calls)
└─────────────────┘
```

## Performance Optimizations

### 1. Batch Processing
- Group embedding generation requests
- Bulk document processing
- Parallel chunk processing

### 2. Lazy Loading
- Progressive document loading
- On-demand embedding generation
- Incremental search results

### 3. Pre-computation
- Magnitude calculation for vectors
- Relationship strength scores
- Pattern effectiveness metrics

### 4. Query Optimization
- Metadata filtering before vector search
- Index-first query planning
- Result pagination

## Security Considerations

1. **API Key Management**
   - Voyage AI keys in environment variables
   - Convex built-in auth for access control

2. **Data Privacy**
   - User-scoped memory isolation
   - Session-based access control
   - Encrypted sensitive metadata

3. **Rate Limiting**
   - API call throttling
   - Batch size limits
   - Concurrent request management

## Monitoring & Analytics

1. **Performance Metrics**
   - Query response times
   - Embedding generation latency
   - Memory operation throughput

2. **Usage Analytics**
   - Pattern effectiveness tracking
   - Memory access patterns
   - Search relevance metrics

3. **System Health**
   - Error rates
   - API quota usage
   - Storage utilization

## Migration Strategy

1. **Schema Translation**
   - PostgreSQL → Convex schema
   - Type system mapping
   - Constraint implementation

2. **Data Migration**
   - Batch export from Supabase
   - Transform to Convex format
   - Incremental sync option

3. **Vector Migration**
   - Embedding format conversion
   - Dimension validation
   - Index rebuilding

## Future Enhancements

1. **Advanced Vector Operations**
   - HNSW-like indexing implementation
   - Approximate nearest neighbor search
   - Dynamic quantization

2. **Multi-Modal Support**
   - Image embeddings
   - Audio processing
   - Video analysis

3. **Distributed Processing**
   - Edge function deployment
   - Regional embedding caches
   - Federated search