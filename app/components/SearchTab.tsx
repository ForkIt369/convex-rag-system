"use client";
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface SearchResult {
  chunk?: {
    content: string;
    documentId: string;
    chunkIndex: number;
  };
  document?: {
    title: string;
    docType: string;
  };
  similarity: number;
}

interface MemoryResult {
  document: {
    content: string;
    memoryType: string;
    metadata?: any;
  };
  similarity: number;
}

export default function SearchTab() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<"documents" | "memories" | "both">("both");
  const [documentResults, setDocumentResults] = useState<SearchResult[]>([]);
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([]);
  const [searchTime, setSearchTime] = useState<number>(0);

  const generateEmbedding = useAction(api.actions.embeddings.generateEmbedding);
  const searchChunksAction = useAction(api.functions.vectorSearchV2.searchChunksV2Action);
  const searchMemoriesAction = useAction(api.functions.vectorSearch.vectorSearchAction);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    const startTime = Date.now();
    
    try {
      // Generate embedding for query
      const embedding = await generateEmbedding({ text: query });

      // Search documents if needed
      if (searchType === "documents" || searchType === "both") {
        const docResults = await searchChunksAction({
          embedding: embedding.embedding,
          limit: 10,
          threshold: 0.7,
        });
        setDocumentResults(docResults?.results || []);
      }

      // Search memories if needed
      if (searchType === "memories" || searchType === "both") {
        const memResults = await searchMemoriesAction({
          embedding: embedding.embedding,
          limit: 10,
          threshold: 0.7,
        });
        setMemoryResults(memResults || []);
      }

      setSearchTime(Date.now() - startTime);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const testQueries = [
    "How does vector search work?",
    "What is the difference between episodic and semantic memory?",
    "Explain the chunking process",
    "How to optimize embedding generation?",
    "What are the best practices for RAG systems?",
  ];

  const runTestQuery = (testQuery: string) => {
    setQuery(testQuery);
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Search Interface</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="documents"
                  checked={searchType === "documents"}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                Documents Only
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="memories"
                  checked={searchType === "memories"}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                Memories Only
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="both"
                  checked={searchType === "both"}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                Both
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your search query..."
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isSearching}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Test Queries */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Try these example queries:</p>
            <div className="flex flex-wrap gap-2">
              {testQueries.map((testQuery, i) => (
                <button
                  key={i}
                  onClick={() => runTestQuery(testQuery)}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                >
                  {testQuery}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {(documentResults.length > 0 || memoryResults.length > 0) && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Search Results</h2>
              <span className="text-sm text-gray-600">
                Found {documentResults.length + memoryResults.length} results in {searchTime}ms
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Document Results */}
            {documentResults.map((result, i) => (
              <div key={`doc-${i}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Document
                    </span>
                    <span className="text-sm text-gray-600">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  {result.document?.title || "Untitled"} - Chunk {result.chunk?.chunkIndex}
                </h3>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  {result.chunk?.content}
                </p>
              </div>
            ))}

            {/* Memory Results */}
            {memoryResults.map((result, i) => (
              <div key={`mem-${i}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧠</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {result.document.memoryType}
                    </span>
                    <span className="text-sm text-gray-600">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  {result.document.content}
                </p>
                {result.document.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    Metadata: {JSON.stringify(result.document.metadata, null, 2).substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Functions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Test Functions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={async () => {
              try {
                const result = await fetch('/api/test/complete-flow', { method: 'POST' });
                const data = await result.json();
                alert(`Test complete! Created document with ${data.chunks} chunks`);
              } catch (error) {
                alert(`Test failed: ${error}`);
              }
            }}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left"
          >
            <h3 className="font-medium text-blue-900 mb-1">Test Complete Flow</h3>
            <p className="text-sm text-blue-700">
              Create document → Chunk → Embed → Search
            </p>
          </button>

          <button
            onClick={async () => {
              try {
                const result = await fetch('/api/test/batch-embeddings', { method: 'POST' });
                const data = await result.json();
                alert(`Generated ${data.count} embeddings with model ${data.model}`);
              } catch (error) {
                alert(`Test failed: ${error}`);
              }
            }}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left"
          >
            <h3 className="font-medium text-green-900 mb-1">Test Batch Embeddings</h3>
            <p className="text-sm text-green-700">
              Generate embeddings for multiple texts
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}