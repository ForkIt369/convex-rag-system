#!/usr/bin/env ts-node

/**
 * Script to store memories (episodic, semantic, or procedural) in the RAG system
 * Usage: npx ts-node scripts/store-memory.ts <type> <content>
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Initialize Convex client
const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type MemoryType = "episodic" | "semantic" | "procedural";

interface MemoryExample {
  type: MemoryType;
  content: string;
  metadata: any;
}

// Example memories for each type
const MEMORY_EXAMPLES: MemoryExample[] = [
  {
    type: "episodic",
    content: "During the code review meeting, the team discovered a critical performance bug in the vector search implementation that was causing 10x slower queries",
    metadata: {
      eventType: "code_review",
      emotionalValence: -0.3, // Slightly negative (found a bug)
      participants: ["dev_team", "tech_lead"],
      location: "virtual_meeting",
      duration: "45 minutes",
      outcome: "bug_identified"
    }
  },
  {
    type: "semantic",
    content: "Vector embeddings are dense numerical representations of text that capture semantic meaning, typically ranging from 384 to 1536 dimensions",
    metadata: {
      concept: "vector_embeddings",
      category: "machine_learning",
      relatedConcepts: ["word2vec", "BERT", "transformers"],
      confidence: 0.95,
      source: "technical_documentation"
    }
  },
  {
    type: "procedural",
    content: "To implement efficient vector search: 1) Generate embeddings using a consistent model, 2) Pre-compute vector magnitudes, 3) Use cosine similarity for comparison, 4) Add database indexes on frequently queried fields",
    metadata: {
      skillName: "implement_vector_search",
      category: "engineering",
      steps: [
        "Generate embeddings",
        "Pre-compute magnitudes",
        "Implement cosine similarity",
        "Add database indexes"
      ],
      difficulty: "intermediate",
      prerequisites: ["understanding_vectors", "database_basics"]
    }
  }
];

async function storeMemory(type: MemoryType, content: string, metadata?: any) {
  try {
    console.log(`🧠 Storing ${type} memory...`);
    
    // 1. Generate embedding for the content
    console.log("🔤 Generating embedding...");
    const embeddingResult = await convex.action(api.actions.embeddings.generateEmbedding, {
      text: content
    });
    
    console.log(`   Model: ${embeddingResult.model}`);
    console.log(`   Dimensions: ${embeddingResult.dimensions}`);
    console.log(`   Magnitude: ${embeddingResult.magnitude.toFixed(4)}`);
    
    // 2. Store the memory with its embedding
    console.log("💾 Storing vector memory...");
    const memoryId = await convex.mutation(api.functions.vectorSearch.storeVectorMemory, {
      memoryType: type,
      content: content,
      embedding: embeddingResult.embedding,
      embeddingModel: embeddingResult.model,
      magnitude: embeddingResult.magnitude,
      metadata: {
        ...metadata,
        storedAt: new Date().toISOString(),
        source: "manual_script"
      }
    });
    
    console.log("✅ Memory stored successfully!");
    console.log(`   Memory ID: ${memoryId}`);
    console.log(`   Type: ${type}`);
    console.log(`   Content: ${content.substring(0, 100)}...`);
    
    return memoryId;
    
  } catch (error) {
    console.error("❌ Error storing memory:", error);
    throw error;
  }
}

// Interactive mode to store multiple memories
async function interactiveMode() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query: string): Promise<string> => 
    new Promise(resolve => readline.question(query, resolve));
  
  console.log("\n🧠 Memory Storage Interactive Mode\n");
  
  while (true) {
    console.log("Select memory type:");
    console.log("1. Episodic (events/experiences)");
    console.log("2. Semantic (facts/concepts)");
    console.log("3. Procedural (how-to/skills)");
    console.log("4. Show examples");
    console.log("5. Exit");
    
    const choice = await question("\nEnter choice (1-5): ");
    
    if (choice === '5') break;
    
    if (choice === '4') {
      console.log("\n📚 Example Memories:\n");
      MEMORY_EXAMPLES.forEach((example, i) => {
        console.log(`${i + 1}. ${example.type.toUpperCase()} Memory:`);
        console.log(`   Content: ${example.content}`);
        console.log(`   Metadata:`, JSON.stringify(example.metadata, null, 2));
        console.log();
      });
      continue;
    }
    
    const typeMap: Record<string, MemoryType> = {
      '1': 'episodic',
      '2': 'semantic',
      '3': 'procedural'
    };
    
    const memoryType = typeMap[choice];
    if (!memoryType) {
      console.log("❌ Invalid choice\n");
      continue;
    }
    
    const content = await question(`\nEnter ${memoryType} memory content:\n> `);
    
    if (content.trim()) {
      // Build metadata based on type
      const metadata: any = {};
      
      if (memoryType === 'episodic') {
        metadata.eventType = await question("Event type (e.g., meeting, discovery): ");
        const valence = await question("Emotional valence (-1 to 1): ");
        metadata.emotionalValence = parseFloat(valence) || 0;
      } else if (memoryType === 'semantic') {
        metadata.concept = await question("Main concept: ");
        metadata.category = await question("Category: ");
        const confidence = await question("Confidence (0-1): ");
        metadata.confidence = parseFloat(confidence) || 0.8;
      } else if (memoryType === 'procedural') {
        metadata.skillName = await question("Skill name: ");
        metadata.category = await question("Category: ");
        metadata.difficulty = await question("Difficulty (easy/intermediate/advanced): ");
      }
      
      await storeMemory(memoryType, content.trim(), metadata);
    }
    
    console.log();
  }
  
  readline.close();
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    await interactiveMode();
  } else if (args.length >= 2) {
    // Command line mode
    const [type, ...contentParts] = args;
    const content = contentParts.join(' ');
    
    if (!['episodic', 'semantic', 'procedural'].includes(type)) {
      console.error("❌ Invalid memory type. Must be: episodic, semantic, or procedural");
      process.exit(1);
    }
    
    await storeMemory(type as MemoryType, content);
  } else {
    console.log("Usage:");
    console.log("  Interactive mode: npx ts-node scripts/store-memory.ts");
    console.log("  Command line: npx ts-node scripts/store-memory.ts <type> <content>");
    console.log("\nTypes: episodic, semantic, procedural");
    console.log("\nExample:");
    console.log('  npx ts-node scripts/store-memory.ts semantic "RAG combines retrieval with generation"');
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}