# Quick Start

Get the Convex RAG system running in 5 minutes.

## 🚀 Prerequisites

- Node.js 18+
- Voyage AI API key

## 📦 Installation

```bash
# Clone and install
git clone <repository-url>
cd convex-rag-system
npm install

# Configure environment
echo "VOYAGE_AI_API_KEY=your-key-here" > .env.local

# Deploy to Convex
npx convex dev
```

## ✅ Test Your System

Visit your Convex dashboard and run:
- Function: `test-functions:testCompleteFlow`

This will:
- Create a document
- Generate embeddings
- Perform vector search
- Validate the entire pipeline

## 📊 Dashboard

- **URL**: https://dashboard.convex.dev/d/gallant-owl-121
- **API**: https://gallant-owl-121.convex.cloud

## 📚 Documentation

- [Full Documentation](./README.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Setup & Deployment](./docs/SETUP_AND_DEPLOYMENT.md)
- [Migration Guide](./docs/MIGRATION_GUIDE.md)

## 🧪 Quick Tests

```bash
# Test embedding generation
npx convex run actions.embeddings:generateEmbedding -- '{"text": "Hello RAG"}'

# Test document search
npx convex run functions.documents:searchDocuments -- '{"query": "vector"}'

# Test complete flow
npx convex run test-functions:testCompleteFlow
```

---

**Status**: ✅ System deployed and ready for use!