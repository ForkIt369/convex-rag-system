import { v } from "convex/values";
import { mutation, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Configuration for chunking
const CHUNK_SIZE = 512; // tokens
const CHUNK_OVERLAP = 128; // tokens
const WORDS_PER_TOKEN = 0.75; // approximate

// Chunk a document into smaller pieces
export const chunkDocument = mutation({
  args: {
    documentId: v.id("documents"),
    chunkSize: v.optional(v.number()),
    chunkOverlap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chunkSize = args.chunkSize || CHUNK_SIZE;
    const chunkOverlap = args.chunkOverlap || CHUNK_OVERLAP;

    // Get the document
    const document = await ctx.db.get(args.documentId);
    if (!document || !document.content) {
      throw new Error("Document not found or has no content");
    }

    // Simple word-based chunking (in production, use a proper tokenizer)
    const words = document.content.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize * WORDS_PER_TOKEN);
    const overlapWords = Math.floor(chunkOverlap * WORDS_PER_TOKEN);

    const chunks = [];
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkContent = chunkWords.join(" ");
      
      if (chunkContent.trim().length === 0) continue;

      const startChar = words.slice(0, i).join(" ").length + (i > 0 ? 1 : 0);
      const endChar = startChar + chunkContent.length;

      const chunkId = await ctx.db.insert("chunks", {
        documentId: args.documentId,
        chunkIndex,
        content: chunkContent,
        tokens: Math.floor(chunkWords.length / WORDS_PER_TOKEN),
        startChar,
        endChar,
        metadata: {
          chunkingMethod: "word-based",
          chunkSize,
          chunkOverlap,
        },
        createdAt: Date.now(),
      });

      chunks.push({
        id: chunkId,
        index: chunkIndex,
        tokens: Math.floor(chunkWords.length / WORDS_PER_TOKEN),
      });

      chunkIndex++;
    }

    // Update document status
    await ctx.db.patch(args.documentId, {
      status: "processing",
      updatedAt: Date.now(),
    });

    return {
      documentId: args.documentId,
      chunksCreated: chunks.length,
      chunks,
    };
  },
});

// Process document: chunk and generate embeddings
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
    chunkSize: v.optional(v.number()),
    chunkOverlap: v.optional(v.number()),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    documentId: Id<"documents">;
    chunksCreated: number;
    embeddingsCreated: number;
    processingTimeMs: number;
  }> => {
    const startTime = Date.now();

    try {
      // Step 1: Chunk the document
      const chunkResult = await ctx.runMutation(api.functions.chunking.chunkDocument, {
        documentId: args.documentId,
        chunkSize: args.chunkSize,
        chunkOverlap: args.chunkOverlap,
      });

      // Step 2: Get chunk contents for embedding
      const chunkContents: string[] = [];
      for (const chunk of chunkResult.chunks) {
        const chunkDoc = await ctx.runQuery(api.functions.documents.getChunk, {
          chunkId: chunk.id,
        });
        if (chunkDoc) {
          chunkContents.push(chunkDoc.content);
        }
      }

      // Step 3: Generate embeddings in batch
      const embeddingResults = await ctx.runAction(api.actions.embeddings.batchGenerateEmbeddings, {
        texts: chunkContents,
        model: args.embeddingModel,
      });

      // Step 4: Store embeddings with chunks
      const embeddingData = chunkResult.chunks.map((chunk, index) => ({
        chunkId: chunk.id,
        embedding: embeddingResults[index].embedding,
        model: embeddingResults[index].model,
        dimensions: embeddingResults[index].dimensions,
      }));

      await ctx.runMutation(api.functions.vectorSearchV2.batchStoreChunkEmbeddings, {
        embeddings: embeddingData,
      });

      // Step 5: Update document status
      await ctx.runMutation(api.functions.documents.updateDocumentStatus, {
        documentId: args.documentId,
        status: "indexed",
        indexedAt: Date.now(),
      });

      return {
        success: true,
        documentId: args.documentId,
        chunksCreated: chunkResult.chunksCreated,
        embeddingsCreated: embeddingResults.length,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Update document status to error
      await ctx.runMutation(api.functions.documents.updateDocumentStatus, {
        documentId: args.documentId,
        status: "error",
      });
      
      throw error;
    }
  },
});

// Delete chunks for a document
export const deleteDocumentChunks = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Get all chunks for the document
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    // Delete embeddings first
    for (const chunk of chunks) {
      const embeddings = await ctx.db
        .query("chunkEmbeddings")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
        .collect();
      
      for (const embedding of embeddings) {
        await ctx.db.delete(embedding._id);
      }
    }

    // Delete chunks
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    return {
      chunksDeleted: chunks.length,
    };
  },
});

// Re-chunk a document with different parameters
export const rechunkDocument = action({
  args: {
    documentId: v.id("documents"),
    chunkSize: v.optional(v.number()),
    chunkOverlap: v.optional(v.number()),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    documentId: Id<"documents">;
    chunksDeleted: number;
    chunksCreated: number;
    embeddingsCreated: number;
    processingTimeMs: number;
  }> => {
    const startTime = Date.now();

    // Step 1: Delete existing chunks
    const deleteResult = await ctx.runMutation(api.functions.chunking.deleteDocumentChunks, {
      documentId: args.documentId,
    });

    // Step 2: Process document with new parameters
    const processResult = await ctx.runAction(api.functions.chunking.processDocument, {
      documentId: args.documentId,
      chunkSize: args.chunkSize,
      chunkOverlap: args.chunkOverlap,
      embeddingModel: args.embeddingModel,
    });

    return {
      success: processResult.success,
      documentId: args.documentId,
      chunksDeleted: deleteResult.chunksDeleted,
      chunksCreated: processResult.chunksCreated,
      embeddingsCreated: processResult.embeddingsCreated,
      processingTimeMs: Date.now() - startTime,
    };
  },
});