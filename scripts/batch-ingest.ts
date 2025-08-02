#!/usr/bin/env ts-node

/**
 * Script for batch ingestion of multiple documents
 * Usage: npx ts-node scripts/batch-ingest.ts <directory-path>
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs/promises";
import * as path from "path";

// Initialize Convex client
const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface FileInfo {
  path: string;
  name: string;
  ext: string;
  size: number;
}

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.html', '.htm'];

async function getFilesFromDirectory(dirPath: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  async function scan(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            name: entry.name,
            ext: ext,
            size: stats.size
          });
        }
      }
    }
  }
  
  await scan(dirPath);
  return files;
}

async function extractMetadataFromFile(filePath: string, fileName: string): Promise<any> {
  const metadata: any = {
    originalFileName: fileName,
    importedAt: new Date().toISOString()
  };
  
  // Try to extract metadata from filename patterns
  // Example: "2023_AuthorName_BookTitle.txt"
  const yearMatch = fileName.match(/(\d{4})/);
  if (yearMatch) {
    metadata.year = parseInt(yearMatch[1]);
  }
  
  // Try to parse JSON files for metadata
  if (path.extname(filePath) === '.json') {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      if (data.metadata) {
        Object.assign(metadata, data.metadata);
      }
    } catch {}
  }
  
  return metadata;
}

async function processFile(file: FileInfo, index: number, total: number) {
  console.log(`\n📄 [${index + 1}/${total}] Processing: ${file.name}`);
  console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
  
  try {
    // Read file content
    const content = await fs.readFile(file.path, 'utf-8');
    
    // Extract title from filename (remove extension)
    const title = path.basename(file.name, file.ext)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    // Extract metadata
    const metadata = await extractMetadataFromFile(file.path, file.name);
    
    // Determine document type
    const docTypeMap: Record<string, any> = {
      '.txt': 'text',
      '.md': 'markdown',
      '.html': 'web',
      '.htm': 'web',
      '.json': 'text'
    };
    const docType = docTypeMap[file.ext] || 'text';
    
    // Create document
    console.log("   Creating document...");
    const documentId = await convex.mutation(api.functions.documents.createDocument, {
      airtableId: `batch-${Date.now()}-${index}`,
      title: title,
      content: content,
      docType: docType,
      fileSize: file.size,
      metadata: metadata
    });
    
    // Process document
    console.log("   Processing (chunking + embeddings)...");
    const result = await convex.action(api.functions.chunking.processDocument, {
      documentId: documentId,
      chunkSize: 512,
      chunkOverlap: 128
    });
    
    console.log(`   ✅ Success: ${result.chunksCreated} chunks created`);
    
    return {
      success: true,
      file: file.name,
      documentId,
      chunks: result.chunksCreated
    };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    return {
      success: false,
      file: file.name,
      error: error
    };
  }
}

async function batchIngest(dirPath: string, options: { parallel?: boolean; maxConcurrent?: number } = {}) {
  console.log(`🗂️  Batch Ingestion Starting`);
  console.log(`📁 Directory: ${dirPath}`);
  
  // Get all supported files
  console.log("\n🔍 Scanning directory...");
  const files = await getFilesFromDirectory(dirPath);
  
  if (files.length === 0) {
    console.log("❌ No supported files found!");
    console.log(`Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    return;
  }
  
  console.log(`✅ Found ${files.length} files to process`);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Process files
  const startTime = Date.now();
  const results: any[] = [];
  
  if (options.parallel) {
    // Process in parallel with concurrency limit
    const maxConcurrent = options.maxConcurrent || 3;
    console.log(`\n⚡ Processing in parallel (max ${maxConcurrent} concurrent)...`);
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((file, j) => processFile(file, i + j, files.length))
      );
      results.push(...batchResults);
    }
  } else {
    // Process sequentially
    console.log("\n📝 Processing sequentially...");
    for (let i = 0; i < files.length; i++) {
      const result = await processFile(files[i], i, files.length);
      results.push(result);
    }
  }
  
  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalChunks = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.chunks, 0);
  
  console.log("\n📊 Batch Ingestion Complete!");
  console.log("═══════════════════════════");
  console.log(`✅ Successful: ${successful} files`);
  console.log(`❌ Failed: ${failed} files`);
  console.log(`📄 Total chunks: ${totalChunks}`);
  console.log(`⏱️  Time elapsed: ${elapsed}s`);
  console.log(`⚡ Average: ${(parseFloat(elapsed) / files.length).toFixed(2)}s per file`);
  
  if (failed > 0) {
    console.log("\n❌ Failed files:");
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.file}: ${r.error}`));
  }
  
  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: npx ts-node scripts/batch-ingest.ts <directory-path> [--parallel]");
    console.log("\nOptions:");
    console.log("  --parallel    Process files in parallel (default: sequential)");
    console.log("  --max=N       Maximum concurrent processes (default: 3)");
    console.log("\nExample:");
    console.log("  npx ts-node scripts/batch-ingest.ts ./documents --parallel --max=5");
    process.exit(1);
  }
  
  const dirPath = args[0];
  
  // Check if directory exists
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      console.error(`❌ Not a directory: ${dirPath}`);
      process.exit(1);
    }
  } catch {
    console.error(`❌ Directory not found: ${dirPath}`);
    process.exit(1);
  }
  
  // Parse options
  const options = {
    parallel: args.includes('--parallel'),
    maxConcurrent: 3
  };
  
  const maxArg = args.find(arg => arg.startsWith('--max='));
  if (maxArg) {
    options.maxConcurrent = parseInt(maxArg.split('=')[1]) || 3;
  }
  
  // Run batch ingestion
  await batchIngest(dirPath, options);
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}