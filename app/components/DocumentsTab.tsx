"use client";
import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DocumentUpload from "./DocumentUpload";

export default function DocumentsTab() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const documents = useQuery(api.functions.documents.listDocuments, {
    limit: 50,
    status: selectedStatus === "all" ? undefined : selectedStatus as any,
  });
  
  const deleteDocument = useMutation(api.functions.documents.deleteDocument);
  const processDocument = useAction(api.functions.chunking.processDocument);
  
  const [processingDocs, setProcessingDocs] = useState<Set<Id<"documents">>>(new Set());

  const handleDelete = async (id: Id<"documents">) => {
    if (confirm("Are you sure you want to delete this document and all its chunks?")) {
      await deleteDocument({ id });
    }
  };

  const handleProcess = async (id: Id<"documents">) => {
    setProcessingDocs(prev => new Set(prev).add(id));
    try {
      await processDocument({ documentId: id });
    } finally {
      setProcessingDocs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      new: "bg-gray-100 text-gray-800",
      processing: "bg-yellow-100 text-yellow-800",
      indexed: "bg-green-100 text-green-800",
      error: "bg-red-100 text-red-800",
      archived: "bg-purple-100 text-purple-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getDocTypeIcon = (type: string) => {
    const icons = {
      pdf: "📄",
      text: "📝",
      web: "🌐",
      code: "💻",
      markdown: "📋",
      epub: "📖",
      other: "📎",
    };
    return icons[type as keyof typeof icons] || "📎";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
        <DocumentUpload />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Documents</h2>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="processing">Processing</option>
              <option value="indexed">Indexed</option>
              <option value="error">Error</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {!documents ? (
          <div className="p-8 text-center text-gray-500">Loading documents...</div>
        ) : documents.documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No documents found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                        <div className="text-xs text-gray-500">ID: {doc.airtableId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl mr-2">{getDocTypeIcon(doc.docType)}</span>
                      <span className="text-sm text-gray-600">{doc.docType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === "new" && (
                          <button
                            onClick={() => handleProcess(doc._id)}
                            disabled={processingDocs.has(doc._id)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {processingDocs.has(doc._id) ? "Processing..." : "Process"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}