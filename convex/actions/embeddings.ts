"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3.5";

// Action to generate embeddings using Voyage AI
export const generateEmbedding = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.VOYAGE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("VOYAGE_AI_API_KEY is not set");
    }

    const model = args.model || VOYAGE_MODEL;

    try {
      const response = await fetch(VOYAGE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: args.text,
          model: model,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Calculate magnitude for efficient similarity search
      const magnitude = Math.sqrt(
        embedding.reduce((sum: number, val: number) => sum + val * val, 0)
      );

      return {
        embedding,
        magnitude,
        model,
        dimensions: embedding.length,
      };
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  },
});

// Batch generate embeddings for multiple texts
export const batchGenerateEmbeddings = action({
  args: {
    texts: v.array(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.VOYAGE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("VOYAGE_AI_API_KEY is not set");
    }

    const model = args.model || VOYAGE_MODEL;
    const batchSize = 128; // Voyage AI batch limit
    const results = [];

    // Process in batches
    for (let i = 0; i < args.texts.length; i += batchSize) {
      const batch = args.texts.slice(i, i + batchSize);

      try {
        const response = await fetch(VOYAGE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: batch,
            model: model,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        
        // Sort by index to maintain order
        const embeddings = data.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => {
            const embedding = item.embedding;
            const magnitude = Math.sqrt(
              embedding.reduce((sum: number, val: number) => sum + val * val, 0)
            );
            return {
              embedding,
              magnitude,
              model,
              dimensions: embedding.length,
            };
          });

        results.push(...embeddings);
      } catch (error) {
        console.error("Error generating batch embeddings:", error);
        throw error;
      }
    }

    return results;
  },
});