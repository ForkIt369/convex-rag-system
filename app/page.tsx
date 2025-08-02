"use client";
import { useState } from "react";
import DocumentsTab from "./components/DocumentsTab";
import MemoriesTab from "./components/MemoriesTab";
import PipelineTab from "./components/PipelineTab";
import SearchTab from "./components/SearchTab";
import Navigation from "./components/Navigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">RAG System Manager</h1>
          <p className="text-sm text-gray-600 mt-1">Manage documents, memories, and visualize your RAG pipeline</p>
        </div>
      </header>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "documents" && <DocumentsTab />}
        {activeTab === "memories" && <MemoriesTab />}
        {activeTab === "pipeline" && <PipelineTab />}
        {activeTab === "search" && <SearchTab />}
      </main>
    </div>
  );
}