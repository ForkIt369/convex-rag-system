/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Convex requires this setting for proper functionality
  experimental: {
    // Required for convex
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Environment variables that should be available in the browser
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
}

module.exports = nextConfig