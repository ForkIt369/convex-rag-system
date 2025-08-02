"use client";
import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type MemoryType = "episodic" | "semantic" | "procedural";

export default function MemoriesTab() {
  const [selectedType, setSelectedType] = useState<MemoryType | "all">("all");
  const [newMemory, setNewMemory] = useState({
    type: "semantic" as MemoryType,
    content: "",
    metadata: {},
  });
  const [isCreating, setIsCreating] = useState(false);

  const memories = useQuery(api.functions.vectorSearch.listVectorMemories, {
    memoryType: selectedType === "all" ? undefined : selectedType,
    limit: 50,
  });

  const generateEmbedding = useAction(api.actions.embeddings.generateEmbedding);
  const storeMemory = useMutation(api.functions.vectorSearch.storeVectorMemory);

  const handleCreateMemory = async () => {
    if (!newMemory.content.trim()) return;

    setIsCreating(true);
    try {
      // Generate embedding
      const embedding = await generateEmbedding({
        text: newMemory.content,
      });

      // Store memory
      await storeMemory({
        memoryType: newMemory.type,
        content: newMemory.content,
        embedding: embedding.embedding,
        embeddingModel: embedding.model,
        magnitude: embedding.magnitude,
        metadata: {
          ...newMemory.metadata,
          createdViaUI: true,
          timestamp: new Date().toISOString(),
        },
      });

      // Reset form
      setNewMemory({
        type: "semantic",
        content: "",
        metadata: {},
      });
    } catch (error) {
      console.error("Error creating memory:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const getMemoryIcon = (type: string) => {
    const icons = {
      episodic: "🎬",
      semantic: "💡",
      procedural: "⚙️",
    };
    return icons[type as keyof typeof icons] || "🧠";
  };

  const getMemoryColor = (type: string) => {
    const colors = {
      episodic: "bg-purple-100 text-purple-800",
      semantic: "bg-blue-100 text-blue-800",
      procedural: "bg-green-100 text-green-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const memoryTypeDescriptions = {
    episodic: "Events and experiences with emotional context",
    semantic: "Facts, concepts, and general knowledge",
    procedural: "How-to knowledge and skills",
  };

  return (
    <div className="space-y-6">
      {/* Create Memory Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Memory</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Memory Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["episodic", "semantic", "procedural"] as MemoryType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewMemory({ ...newMemory, type })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    newMemory.type === type
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{getMemoryIcon(type)}</div>
                  <div className="font-medium capitalize">{type}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {memoryTypeDescriptions[type]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Memory Content
            </label>
            <textarea
              id="content"
              rows={4}
              value={newMemory.content}
              onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                newMemory.type === "episodic"
                  ? "Describe an event or experience..."
                  : newMemory.type === "semantic"
                  ? "Enter a fact or concept..."
                  : "Describe a procedure or skill..."
              }
            />
          </div>

          {/* Type-specific metadata fields */}
          {newMemory.type === "episodic" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., meeting, discovery"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: { ...newMemory.metadata, eventType: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emotional Valence (-1 to 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-1"
                  max="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: {
                        ...newMemory.metadata,
                        emotionalValence: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {newMemory.type === "semantic" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concept
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Main concept"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: { ...newMemory.metadata, concept: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., machine_learning"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: { ...newMemory.metadata, category: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}

          {newMemory.type === "procedural" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Name of the skill"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: { ...newMemory.metadata, skillName: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    setNewMemory({
                      ...newMemory,
                      metadata: { ...newMemory.metadata, difficulty: e.target.value },
                    })
                  }
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateMemory}
            disabled={!newMemory.content.trim() || isCreating}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating Memory..." : "Create Memory"}
          </button>
        </div>
      </div>

      {/* Memories List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Stored Memories</h2>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="episodic">Episodic</option>
              <option value="semantic">Semantic</option>
              <option value="procedural">Procedural</option>
            </select>
          </div>
        </div>

        {!memories ? (
          <div className="p-8 text-center text-gray-500">Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No memories found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {memories.map((memory) => (
              <div key={memory._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getMemoryIcon(memory.memoryType)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMemoryColor(memory.memoryType)}`}>
                        {memory.memoryType}
                      </span>
                      <span className="text-sm text-gray-500">
                        Score: {memory.importanceScore.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Accessed: {memory.accessCount} times
                      </span>
                    </div>
                    <p className="text-gray-900 mb-2">{memory.content}</p>
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Metadata:</span>{" "}
                        {JSON.stringify(memory.metadata, null, 2).substring(0, 100)}...
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      Created: {new Date(memory.createdAt).toLocaleString()} • 
                      Model: {memory.embeddingModel} • 
                      Dimensions: {memory.embedding.length}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}