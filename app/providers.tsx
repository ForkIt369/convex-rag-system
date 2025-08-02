"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

// Log for debugging (remove in production)
if (typeof window !== 'undefined') {
  console.log('[ConvexProvider] NEXT_PUBLIC_CONVEX_URL:', process.env.NEXT_PUBLIC_CONVEX_URL);
  console.log('[ConvexProvider] Using Convex URL:', convexUrl);
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Show a warning if no Convex URL is configured
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Required</h1>
          <p className="text-gray-700 mb-4">
            The Convex RAG System requires environment variables to be set.
          </p>
          <div className="bg-gray-100 p-4 rounded mb-4">
            <p className="font-mono text-sm">
              NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
            </p>
          </div>
          <p className="text-gray-600 text-sm">
            Please set these in your Vercel dashboard under Settings → Environment Variables
          </p>
        </div>
      </div>
    );
  }
  
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}