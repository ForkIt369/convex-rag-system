import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enum-like validators
const docStatus = v.union(
  v.literal("new"),
  v.literal("processing"),
  v.literal("indexed"),
  v.literal("error"),
  v.literal("archived")
);

const docType = v.union(
  v.literal("pdf"),
  v.literal("web"),
  v.literal("text"),
  v.literal("code"),
  v.literal("markdown"),
  v.literal("epub"),
  v.literal("other")
);

const memoryStatus = v.union(
  v.literal("active"),
  v.literal("consolidated"),
  v.literal("archived"),
  v.literal("decayed")
);

const memoryType = v.union(
  v.literal("episodic"),
  v.literal("semantic"),
  v.literal("procedural")
);

const processingAction = v.union(
  v.literal("ingested"),
  v.literal("chunked"),
  v.literal("embedded"),
  v.literal("indexed"),
  v.literal("reindexed")
);

const processingStatus = v.union(
  v.literal("success"),
  v.literal("failed"),
  v.literal("partial")
);

const sessionStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("expired"),
  v.literal("terminated")
);

export default defineSchema({
  // Core document management
  documents: defineTable({
    airtableId: v.string(),
    title: v.string(),
    content: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    docType: docType,
    status: docStatus,
    metadata: v.optional(v.object({})),
    fileSize: v.optional(v.number()),
    language: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    indexedAt: v.optional(v.number()),
    // Full-text search will be handled differently in Convex
    searchText: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["docType"])
    .index("by_airtable", ["airtableId"])
    .searchIndex("search_content", {
      searchField: "searchText",
      filterFields: ["status", "docType"],
    }),

  // Document chunks
  chunks: defineTable({
    documentId: v.id("documents"),
    chunkIndex: v.number(),
    content: v.string(),
    tokens: v.optional(v.number()),
    startChar: v.optional(v.number()),
    endChar: v.optional(v.number()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
    // Embedding stored as array since Convex doesn't have vector type
    embedding: v.optional(v.array(v.number())),
    embeddingModel: v.optional(v.string()),
    embeddingDimensions: v.optional(v.number()),
    // Pre-computed magnitude for efficient similarity search
    magnitude: v.optional(v.number()),
  })
    .index("by_document", ["documentId"])
    .index("by_document_and_index", ["documentId", "chunkIndex"])
    .index("by_model", ["embeddingModel"])
    .index("by_creation", ["createdAt"]),

  // Multi-model embeddings
  embeddings: defineTable({
    chunkId: v.id("chunks"),
    // Different embedding dimensions
    embedding384: v.optional(v.array(v.number())),
    embedding768: v.optional(v.array(v.number())),
    embedding1024: v.optional(v.array(v.number())),
    modelName: v.string(),
    modelVersion: v.optional(v.string()),
    createdAt: v.number(),
    // Pre-computed magnitude for cosine similarity
    magnitude: v.optional(v.number()),
  })
    .index("by_chunk", ["chunkId"])
    .index("by_model", ["modelName"]),

  // Separate chunk embeddings for efficient vector search
  chunkEmbeddings: defineTable({
    chunkId: v.id("chunks"),
    embedding: v.array(v.number()),
    magnitude: v.number(),
    model: v.string(),
    dimensions: v.number(),
    createdAt: v.number(),
  })
    .index("by_chunk", ["chunkId"])
    .index("by_model", ["model"])
    .index("by_creation", ["createdAt"]),

  // Vector memories base table
  vectorMemories: defineTable({
    memoryType: memoryType,
    content: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    metadata: v.optional(v.object({})),
    importanceScore: v.number(),
    accessCount: v.number(),
    lastAccessedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    agentId: v.optional(v.string()),
    agentContext: v.optional(v.object({})),
    confidenceScore: v.number(),
    businessOutcome: v.optional(v.object({})),
    patternAssociations: v.optional(v.array(v.number())),
    // Pre-computed magnitude
    magnitude: v.number(),
  })
    .index("by_type", ["memoryType"])
    .index("by_agent", ["agentId"])
    .index("by_importance", ["importanceScore"]),

  // Episodic memories
  episodicMemories: defineTable({
    vectorMemoryId: v.optional(v.id("vectorMemories")),
    sessionId: v.optional(v.id("memorySessions")),
    eventType: v.string(),
    eventTimestamp: v.number(),
    context: v.optional(v.object({})),
    emotionalValence: v.number(), // -1 to 1
    locationContext: v.optional(v.string()),
    participants: v.optional(v.array(v.string())),
    durationSeconds: v.optional(v.number()),
    status: memoryStatus,
    consolidationCount: v.number(),
    decayRate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    agentId: v.optional(v.string()),
    businessCase: v.optional(v.object({})),
    learningOutcome: v.optional(v.object({})),
    successMetrics: v.optional(v.object({})),
    patternApplied: v.optional(v.array(v.number())),
  })
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_timestamp", ["eventTimestamp"]),

  // Semantic memories
  semanticMemories: defineTable({
    vectorMemoryId: v.optional(v.id("vectorMemories")),
    concept: v.string(),
    category: v.optional(v.string()),
    definition: v.optional(v.string()),
    properties: v.optional(v.object({})),
    relationships: v.optional(v.object({})),
    confidenceScore: v.number(), // 0 to 1
    sourceReferences: v.optional(v.array(v.string())),
    validationCount: v.number(),
    status: memoryStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    agentId: v.optional(v.string()),
    patternAssociations: v.optional(v.array(v.number())),
    businessDomain: v.optional(v.string()),
    conceptRelationships: v.optional(v.object({})),
  })
    .index("by_concept", ["concept"])
    .index("by_category", ["category"])
    .index("by_agent", ["agentId"]),

  // Procedural memories
  proceduralMemories: defineTable({
    vectorMemoryId: v.optional(v.id("vectorMemories")),
    skillName: v.string(),
    skillCategory: v.optional(v.string()),
    steps: v.array(v.object({
      order: v.number(),
      description: v.string(),
      conditions: v.optional(v.object({})),
    })),
    prerequisites: v.optional(v.array(v.string())),
    successRate: v.number(), // 0 to 1
    executionCount: v.number(),
    averageDurationMs: v.optional(v.number()),
    optimizationNotes: v.optional(v.string()),
    status: memoryStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    agentId: v.optional(v.string()),
    successMetrics: v.optional(v.object({})),
    applicationContext: v.optional(v.object({})),
    effectivenessScore: v.number(),
  })
    .index("by_skill", ["skillName"])
    .index("by_category", ["skillCategory"])
    .index("by_agent", ["agentId"]),

  // Knowledge graph nodes
  knowledgeNodes: defineTable({
    nodeType: v.string(),
    label: v.string(),
    properties: v.optional(v.object({})),
    embedding: v.optional(v.array(v.number())),
    importanceScore: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    embeddingModel: v.optional(v.string()),
    magnitude: v.optional(v.number()),
  })
    .index("by_type", ["nodeType"])
    .index("by_label", ["label"])
    .index("by_importance", ["importanceScore"])
    .index("by_type_importance", ["nodeType", "importanceScore"]),

  // Knowledge graph edges
  knowledgeEdges: defineTable({
    sourceNodeId: v.id("knowledgeNodes"),
    targetNodeId: v.id("knowledgeNodes"),
    edgeType: v.string(),
    properties: v.optional(v.object({})),
    weight: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source", ["sourceNodeId"])
    .index("by_target", ["targetNodeId"])
    .index("by_type", ["edgeType"])
    .index("by_source_type", ["sourceNodeId", "edgeType"])
    .index("by_weight", ["weight"]),

  // Business patterns
  businessPatterns: defineTable({
    patternId: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    solution: v.optional(v.string()),
    confidence: v.number(),
    steps: v.optional(v.object({})),
    difficulty: v.optional(v.string()),
    createdAt: v.number(),
    embedding: v.optional(v.array(v.number())),
    magnitude: v.optional(v.number()),
  })
    .index("by_pattern", ["patternId"])
    .index("by_category", ["category"]),

  // Pattern effectiveness tracking
  patternEffectiveness: defineTable({
    patternId: v.number(),
    agentId: v.string(),
    businessContextHash: v.optional(v.string()),
    successRate: v.number(),
    applicationCount: v.number(),
    contextVector: v.optional(v.array(v.number())),
    effectivenessHistory: v.optional(v.array(v.object({}))),
    lastUpdated: v.number(),
  })
    .index("by_pattern_agent", ["patternId", "agentId"]),

  // User memories
  userMemories: defineTable({
    telegramUserId: v.string(),
    agentId: v.string(),
    memoryType: v.union(
      v.literal("business_goals"),
      v.literal("challenges"),
      v.literal("insights"),
      v.literal("preferences"),
      v.literal("context"),
      v.literal("decisions")
    ),
    content: v.string(),
    metadata: v.optional(v.object({})),
    importanceScore: v.number(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    embedding: v.optional(v.array(v.number())),
    magnitude: v.optional(v.number()),
  })
    .index("by_user_agent", ["telegramUserId", "agentId"])
    .index("by_type", ["memoryType"]),

  // Queries and results
  queries: defineTable({
    queryText: v.string(),
    queryEmbedding: v.optional(v.array(v.number())),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    results: v.optional(v.array(v.object({}))),
    resultCount: v.optional(v.number()),
    topScore: v.optional(v.number()),
    feedbackScore: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_creation", ["createdAt"])
    .index("by_user_creation", ["userId", "createdAt"]),

  // Query results
  queryResults: defineTable({
    queryId: v.id("queries"),
    chunkId: v.id("chunks"),
    rank: v.number(),
    score: v.number(),
    rerankScore: v.optional(v.number()),
    wasUsed: v.boolean(),
    userFeedback: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_query", ["queryId"])
    .index("by_query_rank", ["queryId", "rank"]),

  // Memory sessions
  memorySessions: defineTable({
    sessionName: v.optional(v.string()),
    userId: v.optional(v.string()),
    context: v.optional(v.object({})),
    status: sessionStatus,
    memoryStats: v.optional(v.object({})),
    startedAt: v.number(),
    lastActivityAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Agent sessions
  agentSessions: defineTable({
    agentId: v.string(),
    sessionStart: v.number(),
    lastActive: v.number(),
    memoryAccess: v.optional(v.object({})),
    context: v.optional(v.object({})),
    status: sessionStatus,
  })
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"]),

  // Working memory
  workingMemory: defineTable({
    sessionId: v.id("memorySessions"),
    content: v.string(),
    memoryType: memoryType,
    priority: v.number(), // 1-10
    ttlSeconds: v.number(),
    referenceMemories: v.optional(v.array(v.id("vectorMemories"))),
    processingState: v.optional(v.object({})),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_priority", ["priority"])
    .index("by_expiry", ["expiresAt"]),

  // Collections
  collections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    airtableViewId: v.optional(v.string()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // Document collections junction
  documentCollections: defineTable({
    documentId: v.id("documents"),
    collectionId: v.id("collections"),
    addedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_collection", ["collectionId"]),

  // Processing logs
  processingLogs: defineTable({
    documentId: v.id("documents"),
    action: processingAction,
    status: processingStatus,
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_status", ["status"]),

  // Performance logs
  performanceLogs: defineTable({
    operationType: v.string(),
    operationDetails: v.optional(v.object({})),
    durationMs: v.number(),
    memoryType: v.optional(memoryType),
    batchSize: v.number(),
    throughputOpsPerSec: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    sessionId: v.optional(v.id("memorySessions")),
    createdAt: v.number(),
  })
    .index("by_operation", ["operationType"])
    .index("by_session", ["sessionId"]),

  // Migration tracking
  migrationProgress: defineTable({
    migrationType: v.string(),
    totalRecords: v.number(),
    processedRecords: v.number(),
    failedRecords: v.number(),
    status: v.union(
      v.literal("initialized"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    metadata: v.optional(v.object({})),
  })
    .index("by_type", ["migrationType"])
    .index("by_status", ["status"]),
});