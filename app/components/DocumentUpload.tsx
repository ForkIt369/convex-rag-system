"use client";
import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createDocument = useMutation(api.functions.documents.createDocument);
  const processDocument = useAction(api.functions.chunking.processDocument);
  
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      for (const file of Array.from(files)) {
        // Read file content
        const content = await file.text();
        
        // Determine document type from extension
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const docTypeMap: Record<string, any> = {
          'txt': 'text',
          'md': 'markdown',
          'pdf': 'pdf',
          'epub': 'epub',
          'html': 'web',
          'htm': 'web',
          'json': 'text',
        };
        const docType = docTypeMap[ext] || 'text';
        
        // Extract title from filename
        const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        
        // Create document
        const documentId = await createDocument({
          airtableId: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title,
          content: content,
          docType: docType as any,
          fileSize: file.size,
          metadata: {
            originalFileName: file.name,
            uploadedAt: new Date().toISOString(),
            mimeType: file.type,
          },
        });
        
        // Process document (chunking + embeddings)
        await processDocument({
          documentId: documentId,
        });
      }
      
      setUploadStatus({
        type: "success",
        message: `Successfully uploaded and processed ${files.length} document(s)`,
      });
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `Error: ${error instanceof Error ? error.message : "Upload failed"}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.epub,.html,.htm,.json"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <div className="text-4xl">📤</div>
          {isUploading ? (
            <div>
              <div className="text-sm font-medium text-gray-900">Uploading and processing...</div>
              <div className="mt-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-900">
                Drop files here or click to upload
              </div>
              <div className="text-xs text-gray-500">
                Supported: .txt, .md, .pdf, .epub, .html, .json
              </div>
            </>
          )}
        </div>
      </div>

      {uploadStatus.type && (
        <div
          className={`rounded-md p-4 ${
            uploadStatus.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          <p className="text-sm">{uploadStatus.message}</p>
        </div>
      )}
    </div>
  );
}