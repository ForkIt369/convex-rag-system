/**
 * Test functions to verify the RAG system is working correctly
 * Run these from the Convex dashboard Functions tab
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Test the complete flow: create document, chunk it, generate embeddings, and search
export const testCompleteFlow = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    documentId: Id<"documents">;
    memoryId: Id<"vectorMemories">;
    searchResultsCount: number;
    topSimilarity?: number;
  }> => {
    console.log("Starting RAG system test...");
    
    // Step 1: Create a test document
    console.log("1. Creating test document...");
    const docId: Id<"documents"> = await ctx.runMutation(api.functions.documents.createDocument, {
      airtableId: "test-" + Date.now(),
      title: "Introduction to Vector Search",
      content: "Vector search is a method of information retrieval that uses vector embeddings to find similar items. Unlike traditional keyword search, vector search captures semantic meaning and can find conceptually related content even when exact words don't match.",
      docType: "text",
      metadata: { test: true, category: "tutorial" },
    });
    console.log("✓ Document created:", docId);

    // Step 2: Process the document (chunk and embed)
    console.log("2. Processing document (chunking and embedding)...");
    const processResult = await ctx.runAction(api.functions.chunking.processDocument, {
      documentId: docId,
    });
    console.log("✓ Document processed:", {
      chunksCreated: processResult.chunksCreated,
      embeddingsCreated: processResult.embeddingsCreated,
      processingTimeMs: processResult.processingTimeMs,
    });

    // Step 3: Store a vector memory for testing
    console.log("3. Storing vector memory...");
    const embeddingResult: {
      embedding: number[];
      model: string;
      dimensions: number;
      magnitude: number;
    } = await ctx.runAction(api.actions.embeddings.generateEmbedding, {
      text: "Vector search uses embeddings for similarity",
    });
    
    const memoryId: Id<"vectorMemories"> = await ctx.runMutation(api.functions.vectorSearch.storeVectorMemory, {
      memoryType: "semantic",
      content: "Vector search uses embeddings for similarity",
      embedding: embeddingResult.embedding,
      embeddingModel: embeddingResult.model,
      magnitude: embeddingResult.magnitude,
      metadata: { source: "test", documentId: docId },
    });
    console.log("✓ Vector memory stored:", memoryId);

    // Step 4: Test vector search on chunks
    console.log("4. Testing vector search on document chunks...");
    const searchQuery = "How do embeddings work for finding similar content?";
    const queryEmbedding: {
      embedding: number[];
      model: string;
      dimensions: number;
      magnitude: number;
    } = await ctx.runAction(api.actions.embeddings.generateEmbedding, {
      text: searchQuery,
    });
    
    const chunkSearchResults = await ctx.runQuery(api.functions.vectorSearchV2.searchChunksV2, {
      embedding: queryEmbedding.embedding,
      limit: 5,
      threshold: 0.5,
    });
    
    console.log("✓ Chunk search results:", chunkSearchResults.results.length, "matches found");
    console.log("  Search time:", chunkSearchResults.searchTimeMs, "ms");
    chunkSearchResults.results.forEach((result: { similarity: number; chunk: any }, i: number) => {
      console.log(`  ${i + 1}. Similarity: ${result.similarity.toFixed(4)} - ${result.chunk?.content?.substring(0, 50)}...`);
    });

    // Step 5: Test vector memory search
    console.log("5. Testing vector memory search...");
    const memorySearchResults: Array<{
      document: any;
      similarity: number;
      documentId: Id<"vectorMemories">;
    }> = await ctx.runQuery(api.functions.vectorSearch.vectorSearch, {
      embedding: queryEmbedding.embedding,
      limit: 5,
      threshold: 0.5,
    });
    
    console.log("✓ Memory search results:", memorySearchResults.length, "matches found");
    memorySearchResults.forEach((result: { similarity: number; document: { content: string } }, i: number) => {
      console.log(`  ${i + 1}. Similarity: ${result.similarity.toFixed(4)} - ${result.document.content.substring(0, 50)}...`);
    });

    // Step 6: Update access counts
    if (memorySearchResults.length > 0) {
      console.log("6. Updating access counts...");
      await ctx.runMutation(api.functions.vectorSearch.updateAccessCounts, {
        memoryIds: memorySearchResults.map((r: { documentId: Id<"vectorMemories"> }) => r.documentId),
      });
      console.log("✓ Access counts updated");
    }

    return {
      success: true,
      documentId: docId,
      memoryId: memoryId,
      searchResultsCount: memorySearchResults.length,
      topSimilarity: memorySearchResults[0]?.similarity,
    };
  },
});

// Test batch embedding generation
export const testBatchEmbeddings = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    count: number;
    model?: string;
  }> => {
    console.log("Testing batch embeddings...");
    
    const texts = [
      "Machine learning is a subset of artificial intelligence",
      "Deep learning uses neural networks with multiple layers",
      "Natural language processing helps computers understand human language",
      "Computer vision enables machines to interpret visual information",
      "Reinforcement learning trains agents through rewards and penalties",
    ];

    const embeddings: Array<{
      embedding: number[];
      model: string;
      dimensions: number;
      magnitude: number;
    }> = await ctx.runAction(api.actions.embeddings.batchGenerateEmbeddings, {
      texts: texts,
    });

    console.log(`✓ Generated ${embeddings.length} embeddings`);
    embeddings.forEach((emb: { dimensions: number; magnitude: number }, i: number) => {
      console.log(`  ${i + 1}. Text: "${texts[i].substring(0, 40)}..." - Dimensions: ${emb.dimensions}, Magnitude: ${emb.magnitude.toFixed(4)}`);
    });

    return {
      success: true,
      count: embeddings.length,
      model: embeddings[0]?.model,
    };
  },
});

// Test document search
export const testDocumentSearch = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<any>> => {
    console.log(`Searching documents for: "${args.query}"`);
    
    const results: Array<{ title: string; status: string }> = await ctx.runQuery(api.functions.documents.searchDocuments, {
      query: args.query,
      limit: 5,
    });

    console.log(`✓ Found ${results.length} documents`);
    results.forEach((doc: { title: string; status: string }, i: number) => {
      console.log(`  ${i + 1}. ${doc.title} (${doc.status})`);
    });

    return results;
  },
});