import { v } from "convex/values";
import { query, mutation, action } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { cosineSimilarityWithMagnitude } from "../lib/vectors";
import { api } from "../_generated/api";

// Store chunk embedding separately for efficient search
export const storeChunkEmbedding = mutation({
  args: {
    chunkId: v.id("chunks"),
    embedding: v.array(v.number()),
    model: v.string(),
    dimensions: v.number(),
  },
  handler: async (ctx, args) => {
    // Calculate magnitude once during storage
    const magnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0)
    );

    // Store in separate embeddings table
    const embeddingId = await ctx.db.insert("chunkEmbeddings", {
      chunkId: args.chunkId,
      embedding: args.embedding,
      magnitude,
      model: args.model,
      dimensions: args.dimensions,
      createdAt: Date.now(),
    });

    // Update chunk with embedding reference
    await ctx.db.patch(args.chunkId, {
      embeddingModel: args.model,
      embeddingDimensions: args.dimensions,
      magnitude,
    });

    return embeddingId;
  },
});

// Paginated vector search for chunks
export const searchChunksV2 = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
    cursor: v.optional(v.string()), // For pagination
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const threshold = args.threshold || 0.7;
    const startTime = Date.now();

    // Calculate query magnitude
    const queryMagnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0)
    );

    // Build query
    let embeddingsQuery;
    
    if (args.model) {
      embeddingsQuery = ctx.db
        .query("chunkEmbeddings")
        .withIndex("by_model", (q) => 
          q.eq("model", args.model!)
        );
    } else {
      embeddingsQuery = ctx.db.query("chunkEmbeddings");
    }

    // Apply cursor for pagination
    if (args.cursor) {
      const [createdAtStr, idStr] = args.cursor.split(":");
      const createdAt = parseInt(createdAtStr);
      embeddingsQuery = embeddingsQuery.filter((q) =>
        q.or(
          q.lt(q.field("createdAt"), createdAt),
          q.and(
            q.eq(q.field("createdAt"), createdAt),
            q.lt(q.field("_id"), idStr as Id<"chunkEmbeddings">)
          )
        )
      );
    }

    // Get batch of embeddings
    const embeddings = await embeddingsQuery.take(1000);

    // Calculate similarities
    const results = embeddings
      .map((emb) => {
        const similarity = cosineSimilarityWithMagnitude(
          args.embedding,
          emb.embedding,
          queryMagnitude,
          emb.magnitude
        );
        return { embeddingDoc: emb, similarity };
      })
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Get associated chunks
    const chunkIds = results.map(r => r.embeddingDoc.chunkId);
    const chunks = await Promise.all(
      chunkIds.map(id => ctx.db.get(id))
    );

    // Get associated documents
    const documentIds = [...new Set(
      chunks
        .filter((c): c is Doc<"chunks"> => c !== null)
        .map(c => c.documentId)
    )];
    
    const documents = await Promise.all(
      documentIds.map(id => ctx.db.get(id))
    );
    
    const docMap = new Map(
      documents
        .filter((d): d is Doc<"documents"> => d !== null)
        .map(d => [d._id, d])
    );

    // Build response with pagination info
    const response = results.map(({ embeddingDoc, similarity }, index) => {
      const chunk = chunks[index];
      return {
        chunk,
        similarity,
        document: chunk ? docMap.get(chunk.documentId) : null,
        embeddingId: embeddingDoc._id,
      };
    });

    // Create cursor for next page
    const lastResult = embeddings[embeddings.length - 1];
    const nextCursor = lastResult 
      ? `${lastResult.createdAt}:${lastResult._id}`
      : null;

    return {
      results: response,
      nextCursor,
      hasMore: embeddings.length === 1000,
      searchTimeMs: Date.now() - startTime,
    };
  },
});

// Batch update chunk embeddings
export const batchStoreChunkEmbeddings = mutation({
  args: {
    embeddings: v.array(v.object({
      chunkId: v.id("chunks"),
      embedding: v.array(v.number()),
      model: v.string(),
      dimensions: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const item of args.embeddings) {
      const magnitude = Math.sqrt(
        item.embedding.reduce((sum, val) => sum + val * val, 0)
      );

      const embeddingId = await ctx.db.insert("chunkEmbeddings", {
        chunkId: item.chunkId,
        embedding: item.embedding,
        magnitude,
        model: item.model,
        dimensions: item.dimensions,
        createdAt: Date.now(),
      });

      await ctx.db.patch(item.chunkId, {
        embeddingModel: item.model,
        embeddingDimensions: item.dimensions,
        magnitude,
      });

      results.push(embeddingId);
    }

    return results;
  },
});

// Get similar chunks with pre-filtering
export const getSimilarChunks = query({
  args: {
    chunkId: v.id("chunks"),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const threshold = args.threshold || 0.8;

    // Get the embedding for the source chunk
    const sourceEmbedding = await ctx.db
      .query("chunkEmbeddings")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .first();

    if (!sourceEmbedding) {
      return { results: [], message: "No embedding found for this chunk" };
    }

    // Search for similar chunks
    const searchResults = await ctx.runQuery(api.functions.vectorSearchV2.searchChunksV2, {
      embedding: sourceEmbedding.embedding,
      limit,
      threshold,
      model: sourceEmbedding.model,
    });

    // Filter out the source chunk
    const filtered = searchResults.results.filter(
      (r: any) => r.chunk?._id !== args.chunkId
    );

    return {
      results: filtered,
      sourceModel: sourceEmbedding.model,
      searchTimeMs: searchResults.searchTimeMs,
    };
  },
});

// Action wrapper for searchChunksV2 (for client-side use)
export const searchChunksV2Action = action({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
    cursor: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(api.functions.vectorSearchV2.searchChunksV2, args);
  },
});