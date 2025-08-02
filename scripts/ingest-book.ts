#!/usr/bin/env ts-node

/**
 * Script to ingest a book or large text document into the RAG system
 * Usage: npx ts-node scripts/ingest-book.ts <file-path> <title>
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs/promises";
import * as path from "path";

// Initialize Convex client
const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function ingestBook(filePath: string, title: string, metadata?: any) {
  try {
    console.log(`📚 Starting ingestion of: ${title}`);
    
    // 1. Read file content
    console.log("📖 Reading file...");
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Characters: ${content.length}`);
    
    // 2. Determine document type from extension
    const ext = path.extname(filePath).toLowerCase();
    const docTypeMap: Record<string, any> = {
      '.txt': 'text',
      '.md': 'markdown',
      '.pdf': 'pdf',
      '.epub': 'epub',
      '.html': 'web',
      '.htm': 'web',
    };
    const docType = docTypeMap[ext] || 'text';
    
    // 3. Create document in database
    console.log("💾 Creating document entry...");
    const documentId = await convex.mutation(api.functions.documents.createDocument, {
      airtableId: `book-${Date.now()}`,
      title: title,
      content: content,
      docType: docType,
      fileSize: stats.size,
      metadata: {
        ...metadata,
        originalPath: filePath,
        ingestionDate: new Date().toISOString(),
      }
    });
    
    console.log(`   Document ID: ${documentId}`);
    
    // 4. Process document (chunk and embed)
    console.log("🔄 Processing document (chunking and embedding)...");
    console.log("   This may take a few minutes for large documents...");
    
    const startTime = Date.now();
    const result = await convex.action(api.functions.chunking.processDocument, {
      documentId: documentId,
      chunkSize: 512,    // Adjust based on your needs
      chunkOverlap: 128, // Adjust based on your needs
    });
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("✅ Ingestion complete!");
    console.log(`   Chunks created: ${result.chunksCreated}`);
    console.log(`   Embeddings generated: ${result.embeddingsCreated}`);
    console.log(`   Processing time: ${processingTime}s`);
    console.log(`   Document status: indexed`);
    
    return {
      documentId,
      chunks: result.chunksCreated,
      processingTime,
    };
    
  } catch (error) {
    console.error("❌ Error during ingestion:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: npx ts-node scripts/ingest-book.ts <file-path> <title> [author] [year]");
    console.log("Example: npx ts-node scripts/ingest-book.ts ./books/art-of-war.txt \"The Art of War\" \"Sun Tzu\" \"-500\"");
    process.exit(1);
  }
  
  const [filePath, title, author, year] = args;
  
  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Build metadata
  const metadata: any = {};
  if (author) metadata.author = author;
  if (year) metadata.year = parseInt(year);
  
  // Ingest the book
  await ingestBook(filePath, title, metadata);
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}