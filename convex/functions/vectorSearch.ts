import { v } from "convex/values";
import { query, mutation, action } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { cosineSimilarityWithMagnitude } from "../lib/vectors";
import { api } from "../_generated/api";

// Store a vector memory
export const storeVectorMemory = mutation({
  args: {
    memoryType: v.union(v.literal("episodic"), v.literal("semantic"), v.literal("procedural")),
    content: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    magnitude: v.number(),
    metadata: v.optional(v.object({})),
    importanceScore: v.optional(v.number()),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vectorMemoryId = await ctx.db.insert("vectorMemories", {
      ...args,
      importanceScore: args.importanceScore || 0.5,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      confidenceScore: 0.5,
    });

    return vectorMemoryId;
  },
});

// Vector similarity search
export const vectorSearch = query({
  args: {
    embedding: v.array(v.number()),
    memoryType: v.optional(v.union(v.literal("episodic"), v.literal("semantic"), v.literal("procedural"))),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const threshold = args.threshold || 0.7;

    // Calculate query magnitude
    const queryMagnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0)
    );

    // Get candidates based on filters
    let candidates;
    
    if (args.memoryType && args.agentId) {
      // Can't use multiple indexes, so filter by one and then manually filter the other
      candidates = await ctx.db
        .query("vectorMemories")
        .withIndex("by_type", (q) => q.eq("memoryType", args.memoryType!))
        .filter((q) => q.eq(q.field("agentId"), args.agentId))
        .take(1000);
    } else if (args.memoryType) {
      candidates = await ctx.db
        .query("vectorMemories")
        .withIndex("by_type", (q) => q.eq("memoryType", args.memoryType!))
        .take(1000);
    } else if (args.agentId) {
      candidates = await ctx.db
        .query("vectorMemories")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
        .take(1000);
    } else {
      candidates = await ctx.db
        .query("vectorMemories")
        .take(1000);
    }

    // Calculate similarities
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

    // Return results with IDs for access tracking
    return results.map(r => ({
      ...r,
      documentId: r.document._id,
    }));
  },
});

// Update access counts for vector memories
export const updateAccessCounts = mutation({
  args: {
    memoryIds: v.array(v.id("vectorMemories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    for (const id of args.memoryIds) {
      const memory = await ctx.db.get(id);
      if (memory) {
        await ctx.db.patch(id, {
          accessCount: memory.accessCount + 1,
          lastAccessedAt: now,
        });
      }
    }
  },
});

// Search chunks by vector similarity
export const searchChunks = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const threshold = args.threshold || 0.7;

    // Get chunks with embeddings and pre-computed magnitudes
    const chunks = await ctx.db
      .query("chunks")
      .filter((q) => 
        q.and(
          q.neq(q.field("embedding"), undefined),
          q.neq(q.field("magnitude"), undefined)
        )
      )
      .take(1000); // Limit for performance

    // Calculate query magnitude
    const queryMagnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0)
    );

    // Calculate similarities using pre-computed magnitudes
    const results = chunks
      .map((chunk) => {
        if (!chunk.embedding || !chunk.magnitude) return null;
        
        const similarity = cosineSimilarityWithMagnitude(
          args.embedding,
          chunk.embedding,
          queryMagnitude,
          chunk.magnitude
        );
        
        return { chunk, similarity };
      })
      .filter((result): result is { chunk: typeof chunks[0]; similarity: number } => 
        result !== null && result.similarity >= threshold
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Get associated documents
    const documentIds = [...new Set(results.map(r => r.chunk.documentId))];
    const documents = await Promise.all(
      documentIds.map(id => ctx.db.get(id))
    );
    
    const docMap = new Map(
      documents.filter((d): d is Doc<"documents"> => d !== null)
        .map(d => [d._id, d])
    );

    return results.map(({ chunk, similarity }) => ({
      chunk,
      similarity,
      document: docMap.get(chunk.documentId),
    }));
  },
});

// Store chunk with embedding and pre-computed magnitude
export const storeChunkWithEmbedding = mutation({
  args: {
    documentId: v.id("documents"),
    chunkIndex: v.number(),
    content: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    tokens: v.optional(v.number()),
    startChar: v.optional(v.number()),
    endChar: v.optional(v.number()),
    metadata: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    // Calculate magnitude once during storage
    const magnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0)
    );

    const chunkId = await ctx.db.insert("chunks", {
      documentId: args.documentId,
      chunkIndex: args.chunkIndex,
      content: args.content,
      tokens: args.tokens,
      startChar: args.startChar,
      endChar: args.endChar,
      metadata: args.metadata,
      createdAt: Date.now(),
      embedding: args.embedding,
      embeddingModel: args.embeddingModel,
      embeddingDimensions: args.embedding.length,
      magnitude,
    });

    return chunkId;
  },
});

// List vector memories with optional filtering
export const listVectorMemories = query({
  args: {
    memoryType: v.optional(v.union(
      v.literal("episodic"),
      v.literal("semantic"),
      v.literal("procedural")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const query = args.memoryType
      ? ctx.db.query("vectorMemories").withIndex("by_type", (q) => q.eq("memoryType", args.memoryType!))
      : ctx.db.query("vectorMemories");
    
    const memories = await query.take(limit);
    
    return memories;
  },
});

// Action wrapper for vectorSearch (for client-side use)
export const vectorSearchAction = action({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(api.functions.vectorSearch.vectorSearch, args);
  },
});