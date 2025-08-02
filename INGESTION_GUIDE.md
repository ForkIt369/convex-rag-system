# RAG System Ingestion Guide

## 📚 Document Ingestion Pipeline

### Overview
The system processes documents through a pipeline: **Create → Chunk → Embed → Index**

### 1. Adding Books/PDFs/Documents

```typescript
// Example: Add a book to the system
import { api } from "./convex/_generated/api";

// Step 1: Create document entry
const documentId = await convex.mutation(api.functions.documents.createDocument, {
  airtableId: `book-${Date.now()}`, // Unique identifier
  title: "The Art of War",
  content: fullBookText, // The complete text content
  docType: "text", // Options: "pdf", "epub", "text", "web", "code", "markdown", "other"
  metadata: {
    author: "Sun Tzu",
    year: -500,
    category: "Philosophy/Strategy",
    isbn: "978-0-14-043919-6"
  },
  language: "en"
});

// Step 2: Process the document (chunking + embeddings)
const result = await convex.action(api.functions.chunking.processDocument, {
  documentId: documentId,
  chunkSize: 512,     // Optional: tokens per chunk (default: 512)
  chunkOverlap: 128   // Optional: overlap between chunks (default: 128)
});

console.log(`Created ${result.chunksCreated} chunks with embeddings`);
```

### Document Types Supported
- **PDF**: Extract text first, then use `docType: "pdf"`
- **EPUB**: Extract text first, then use `docType: "epub"`
- **Web Pages**: Scrape content, then use `docType: "web"`
- **Plain Text**: Direct text, use `docType: "text"`
- **Code**: Source code files, use `docType: "code"`
- **Markdown**: MD files, use `docType: "markdown"`

## 🧠 Memory Storage Pipeline

### Three Types of Cognitive Memories

#### 1. Episodic Memory (Events/Experiences)
```typescript
// Store an episodic memory (an event that happened)
const episodicMemoryId = await convex.mutation(api.functions.vectorSearch.storeVectorMemory, {
  memoryType: "episodic",
  content: "User successfully implemented vector search after struggling with performance issues",
  embedding: embeddingVector, // Generate with embeddings API
  embeddingModel: "voyage-3.5",
  magnitude: vectorMagnitude,
  metadata: {
    eventType: "learning_milestone",
    emotionalValence: 0.8, // Positive experience
    participants: ["user", "ai_assistant"],
    context: {
      problem: "slow vector search",
      solution: "pre-computed magnitudes",
      duration: "2 hours"
    }
  }
});
```

#### 2. Semantic Memory (Facts/Concepts)
```typescript
// Store a semantic memory (factual knowledge)
const semanticMemoryId = await convex.mutation(api.functions.vectorSearch.storeVectorMemory, {
  memoryType: "semantic",
  content: "Cosine similarity measures the angle between vectors, making it ideal for comparing embeddings regardless of magnitude",
  embedding: embeddingVector,
  embeddingModel: "voyage-3.5",
  magnitude: vectorMagnitude,
  metadata: {
    concept: "cosine_similarity",
    category: "machine_learning",
    relatedConcepts: ["vector_embeddings", "similarity_search"],
    confidence: 0.95
  }
});
```

#### 3. Procedural Memory (How-to/Skills)
```typescript
// Store a procedural memory (how to do something)
const proceduralMemoryId = await convex.mutation(api.functions.vectorSearch.storeVectorMemory, {
  memoryType: "procedural",
  content: "To optimize vector search: 1) Pre-compute magnitudes, 2) Store embeddings separately, 3) Add proper indexes, 4) Implement pagination",
  embedding: embeddingVector,
  embeddingModel: "voyage-3.5",
  magnitude: vectorMagnitude,
  metadata: {
    skillName: "vector_search_optimization",
    steps: [
      "Pre-compute vector magnitudes",
      "Create separate embeddings table",
      "Add database indexes",
      "Implement cursor pagination"
    ],
    successRate: 0.92,
    prerequisites: ["understanding_vectors", "database_design"]
  }
});
```

## 🔄 Complete Ingestion Flow

### For Books/Large Documents:
```typescript
async function ingestBook(bookPath: string, metadata: any) {
  // 1. Read and prepare content
  const content = await fs.readFile(bookPath, 'utf-8');
  
  // 2. Create document
  const docId = await convex.mutation(api.functions.documents.createDocument, {
    airtableId: `book-${metadata.isbn || Date.now()}`,
    title: metadata.title,
    content: content,
    docType: "text",
    metadata: metadata
  });
  
  // 3. Process with chunking and embeddings
  const result = await convex.action(api.functions.chunking.processDocument, {
    documentId: docId,
    chunkSize: 512,
    chunkOverlap: 128
  });
  
  return {
    documentId: docId,
    chunks: result.chunksCreated,
    status: "indexed"
  };
}
```

### For Memories/Knowledge:
```typescript
async function storeKnowledge(text: string, type: "episodic" | "semantic" | "procedural") {
  // 1. Generate embedding
  const { embedding, magnitude } = await convex.action(api.actions.embeddings.generateEmbedding, {
    text: text
  });
  
  // 2. Store as vector memory
  const memoryId = await convex.mutation(api.functions.vectorSearch.storeVectorMemory, {
    memoryType: type,
    content: text,
    embedding: embedding,
    embeddingModel: "voyage-3.5",
    magnitude: magnitude,
    metadata: {
      source: "manual_entry",
      timestamp: Date.now()
    }
  });
  
  return memoryId;
}
```

## 🔍 Searching Content

### Search Documents:
```typescript
// Generate query embedding
const queryEmbedding = await convex.action(api.actions.embeddings.generateEmbedding, {
  text: "How to implement vector search?"
});

// Search document chunks
const results = await convex.query(api.functions.vectorSearchV2.searchChunksV2, {
  embedding: queryEmbedding.embedding,
  limit: 10,
  threshold: 0.7
});
```

### Search Memories:
```typescript
// Search vector memories
const memories = await convex.query(api.functions.vectorSearch.vectorSearch, {
  embedding: queryEmbedding.embedding,
  limit: 5,
  threshold: 0.75
});
```

## 📝 Batch Processing

### For Multiple Documents:
```typescript
async function batchIngestDocuments(documents: Array<{title: string, content: string, metadata: any}>) {
  const results = [];
  
  for (const doc of documents) {
    // Create document
    const docId = await convex.mutation(api.functions.documents.createDocument, {
      airtableId: `doc-${Date.now()}-${Math.random()}`,
      title: doc.title,
      content: doc.content,
      docType: "text",
      metadata: doc.metadata
    });
    
    // Process in background
    convex.action(api.functions.chunking.processDocument, {
      documentId: docId
    });
    
    results.push(docId);
  }
  
  return results;
}
```

## 🛠️ API Endpoints Needed

To make ingestion easier, you might want to create these API endpoints:

```typescript
// app/api/ingest/document/route.ts
export async function POST(req: Request) {
  const { title, content, docType, metadata } = await req.json();
  
  // Create and process document
  const docId = await createDocument({ title, content, docType, metadata });
  await processDocument({ documentId: docId });
  
  return Response.json({ success: true, documentId: docId });
}

// app/api/ingest/memory/route.ts
export async function POST(req: Request) {
  const { text, memoryType, metadata } = await req.json();
  
  // Generate embedding and store
  const embedding = await generateEmbedding({ text });
  const memoryId = await storeVectorMemory({
    memoryType,
    content: text,
    embedding: embedding.embedding,
    magnitude: embedding.magnitude,
    metadata
  });
  
  return Response.json({ success: true, memoryId });
}
```

## 🚀 Quick Start Examples

### 1. Add a PDF Book:
```bash
# First extract text from PDF (use any PDF extraction tool)
pdftotext "book.pdf" "book.txt"

# Then use the API or direct function calls to ingest
```

### 2. Add Web Content:
```typescript
const webContent = await fetch(url).then(r => r.text());
const cleaned = cleanHTML(webContent); // Remove HTML tags
await ingestDocument({
  title: pageTitle,
  content: cleaned,
  docType: "web",
  metadata: { sourceUrl: url }
});
```

### 3. Add Knowledge Memory:
```typescript
await storeKnowledge(
  "The key to effective RAG is good chunking strategy with overlap",
  "semantic"
);
```

## 📊 Monitoring Ingestion

Check document status:
```typescript
const docs = await convex.query(api.functions.documents.listDocuments, {
  status: "processing"
});
```

The system tracks:
- Document status: `new` → `processing` → `indexed`
- Chunk count per document
- Embedding generation time
- Error states

## 🔧 Configuration

Default settings:
- **Chunk Size**: 512 tokens
- **Chunk Overlap**: 128 tokens
- **Embedding Model**: voyage-3.5 (1024 dimensions)
- **Similarity Threshold**: 0.7

These can be adjusted per document during processing.