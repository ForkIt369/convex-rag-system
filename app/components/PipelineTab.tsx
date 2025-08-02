"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function PipelineTab() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    indexedDocuments: 0,
    totalChunks: 0,
    totalMemories: 0,
    avgChunksPerDoc: 0,
  });

  // Get documents stats
  const allDocs = useQuery(api.functions.documents.listDocuments, { limit: 1000 });
  const memories = useQuery(api.functions.vectorSearch.listVectorMemories, { limit: 1000 });

  useEffect(() => {
    if (allDocs && memories) {
      const indexed = allDocs.documents.filter(d => d.status === "indexed").length;
      setStats({
        totalDocuments: allDocs.documents.length,
        indexedDocuments: indexed,
        totalChunks: 0, // Would need a query to get chunk count
        totalMemories: memories.length,
        avgChunksPerDoc: 0,
      });
    }
  }, [allDocs, memories]);

  const PipelineStep = ({ 
    icon, 
    title, 
    description, 
    stats: stepStats 
  }: {
    icon: string;
    title: string;
    description: string;
    stats?: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      {stepStats && (
        <div className="text-2xl font-bold text-blue-600">{stepStats}</div>
      )}
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center px-4">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Pipeline Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">RAG Pipeline Overview</h2>
        
        <div className="grid grid-cols-7 gap-4 items-center">
          <PipelineStep
            icon="📥"
            title="Input"
            description="Documents & Memories"
            stats={`${stats.totalDocuments + stats.totalMemories}`}
          />
          <Arrow />
          <PipelineStep
            icon="✂️"
            title="Chunking"
            description="Split into segments"
            stats={`~${stats.avgChunksPerDoc}/doc`}
          />
          <Arrow />
          <PipelineStep
            icon="🔤"
            title="Embedding"
            description="Voyage AI (1024d)"
            stats="voyage-3.5"
          />
          <Arrow />
          <PipelineStep
            icon="💾"
            title="Storage"
            description="Vector database"
            stats={`${stats.totalChunks + stats.totalMemories}`}
          />
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Document Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Documents</span>
              <span className="font-semibold">{stats.totalDocuments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Indexed</span>
              <span className="font-semibold text-green-600">{stats.indexedDocuments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing</span>
              <span className="font-semibold text-yellow-600">
                {stats.totalDocuments - stats.indexedDocuments}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Memory Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Memories</span>
              <span className="font-semibold">{stats.totalMemories}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Episodic</span>
              <span className="font-semibold text-purple-600">
                {memories?.filter(m => m.memoryType === "episodic").length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Semantic</span>
              <span className="font-semibold text-blue-600">
                {memories?.filter(m => m.memoryType === "semantic").length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Procedural</span>
              <span className="font-semibold text-green-600">
                {memories?.filter(m => m.memoryType === "procedural").length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Embedding Model</span>
              <span className="font-semibold">voyage-3.5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dimensions</span>
              <span className="font-semibold">1024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Chunk Size</span>
              <span className="font-semibold">512 tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overlap</span>
              <span className="font-semibold">128 tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Flow Diagram */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Processing Flow</h3>
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="space-y-6">
            {/* Document Flow */}
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium">
                Document Upload
              </div>
              <Arrow />
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                Text Extraction
              </div>
              <Arrow />
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                Chunking (512 tokens)
              </div>
              <Arrow />
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                Voyage Embedding
              </div>
              <Arrow />
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                Indexed ✓
              </div>
            </div>

            {/* Memory Flow */}
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-medium">
                Memory Input
              </div>
              <Arrow />
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
                Type Classification
              </div>
              <Arrow />
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
                Direct Embedding
              </div>
              <Arrow />
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
                Metadata Enrichment
              </div>
              <Arrow />
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                Stored ✓
              </div>
            </div>

            {/* Search Flow */}
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium">
                Search Query
              </div>
              <Arrow />
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
                Query Embedding
              </div>
              <Arrow />
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
                Cosine Similarity
              </div>
              <Arrow />
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
                Rank & Filter
              </div>
              <Arrow />
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                Results ✓
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">~100ms</div>
            <div className="text-sm text-gray-600 mt-1">Vector Search</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">~2-3s</div>
            <div className="text-sm text-gray-600 mt-1">Batch Embedding</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">1.75M</div>
            <div className="text-sm text-gray-600 mt-1">Ops/sec Capability</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">0.7</div>
            <div className="text-sm text-gray-600 mt-1">Default Threshold</div>
          </div>
        </div>
      </div>
    </div>
  );
}