import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

// Create a new document
export const createDocument = mutation({
  args: {
    airtableId: v.string(),
    title: v.string(),
    content: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    docType: v.union(
      v.literal("pdf"),
      v.literal("web"),
      v.literal("text"),
      v.literal("code"),
      v.literal("markdown"),
      v.literal("epub"),
      v.literal("other")
    ),
    metadata: v.optional(v.object({})),
    fileSize: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const documentId = await ctx.db.insert("documents", {
      ...args,
      status: "new",
      language: args.language || "en",
      createdAt: now,
      updatedAt: now,
      searchText: `${args.title} ${args.content || ""}`.substring(0, 1000),
    });

    return documentId;
  },
});

// Get a document by ID
export const getDocument = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List documents with pagination
export const listDocuments = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("processing"),
      v.literal("indexed"),
      v.literal("error"),
      v.literal("archived")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Build query based on filters
    const documents = await (args.status
      ? ctx.db
          .query("documents")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .take(limit)
      : ctx.db
          .query("documents")
          .take(limit)
    );
    
    return {
      documents,
      nextCursor: documents.length === limit ? documents[documents.length - 1]._id : null,
    };
  },
});

// Update document status
export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("new"),
      v.literal("processing"),
      v.literal("indexed"),
      v.literal("error"),
      v.literal("archived")
    ),
    indexedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.indexedAt) {
      updateData.indexedAt = args.indexedAt;
    } else if (args.status === "indexed") {
      updateData.indexedAt = Date.now();
    }

    await ctx.db.patch(args.documentId, updateData);
  },
});

// Search documents
export const searchDocuments = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_content", (q) => q.search("searchText", args.query))
      .take(args.limit || 10);
    
    return results;
  },
});

// Get a single chunk
export const getChunk = query({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

// Delete a document
export const deleteDocument = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // First delete all chunks
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();
    
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
    
    // Then delete the document
    await ctx.db.delete(args.id);
    
    return {
      deleted: true,
      chunksDeleted: chunks.length,
    };
  },
});