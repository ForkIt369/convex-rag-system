# Setup and Deployment Guide

Complete guide for setting up and deploying the Convex RAG System.

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For version control

### Required Accounts

1. **Convex Account**: Sign up at [convex.dev](https://www.convex.dev)
2. **Voyage AI Account**: Sign up at [voyageai.com](https://www.voyageai.com)
3. **GitHub Account** (optional): For CI/CD deployment

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd convex-rag-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Convex Configuration (auto-generated after init)
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Voyage AI Configuration (required)
VOYAGE_AI_API_KEY=pa-your-voyage-ai-api-key

# Optional: Development Settings
NODE_ENV=development
LOG_LEVEL=debug

# Optional: Performance Settings
VECTOR_BATCH_SIZE=128
EMBEDDING_CACHE_TTL=86400

# Optional: External Services
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
```

### 4. Initialize Convex

```bash
# First time setup - creates new project
npx convex dev --once --configure=new

# Follow the prompts:
# 1. Choose team (or create new)
# 2. Enter project name
# 3. Select region (closest to your users)
```

This will:
- Create a new Convex project
- Generate `convex/_generated` files
- Update `.env.local` with deployment details
- Deploy your schema and functions

### 5. Verify Setup

```bash
# Check that Convex is connected
npx convex dev --once

# You should see:
# ✓ Schema and functions deployed to <your-deployment-url>
```

## Database Schema Deployment

### Initial Schema Deployment

The schema is automatically deployed when you run `npx convex dev`. To manually deploy:

```bash
# Deploy schema only
npx convex deploy --functions=false
```

### Schema Updates

When modifying `convex/schema.ts`:

1. **Development**: Changes auto-deploy with `npx convex dev`
2. **Production**: Use careful migration strategy

```typescript
// Example: Adding a new field with backward compatibility
documents: defineTable({
  // Existing fields...
  newField: v.optional(v.string()), // Optional for backward compatibility
})
```

## Function Deployment

### Deploy All Functions

```bash
# Deploy everything (schema + functions)
npx convex deploy
```

### Deploy Specific Functions

```bash
# Deploy only document functions
npx convex deploy --functions convex/functions/documents.ts

# Deploy only actions
npx convex deploy --functions convex/actions/embeddings.ts
```

## Testing Deployment

### 1. Basic Health Check

```bash
# Run the test function
npx convex run test-functions:testCompleteFlow
```

### 2. Via Dashboard

1. Visit your dashboard: `https://dashboard.convex.dev`
2. Navigate to your project
3. Go to "Functions" tab
4. Find `test-functions:testCompleteFlow`
5. Click "Run Function"

### 3. API Testing

```bash
# Test document creation
curl -X POST https://your-deployment.convex.cloud/api/functions/documents/createDocument \
  -H "Content-Type: application/json" \
  -d '{
    "airtableId": "test-001",
    "title": "Test Document",
    "content": "This is a test",
    "docType": "text"
  }'
```

## Production Deployment

### 1. Create Production Project

```bash
# Create separate production deployment
npx convex deploy --prod --configure=new

# This creates a new project with -prod suffix
```

### 2. Environment Variables

```bash
# Set production environment variables
npx convex env set VOYAGE_AI_API_KEY "your-production-key" --prod

# Verify environment variables
npx convex env list --prod
```

### 3. Deploy to Production

```bash
# Full deployment to production
npx convex deploy --prod

# Or with specific commit
npx convex deploy --prod --functions-version <commit-hash>
```

### 4. Production Configuration

Update your production app's environment:

```javascript
// For Next.js apps
const convexUrl = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_CONVEX_URL_PROD
  : process.env.NEXT_PUBLIC_CONVEX_URL;
```

## CI/CD Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Convex

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Deploy to Convex
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
        run: |
          npx convex deploy --prod --deploy-key $CONVEX_DEPLOY_KEY
```

### Setting up Deploy Key

1. Generate deploy key:
```bash
npx convex deploy-key --prod
```

2. Add to GitHub Secrets:
   - Go to repository Settings → Secrets
   - Add new secret: `CONVEX_DEPLOY_KEY`

## Monitoring and Maintenance

### 1. Dashboard Monitoring

Access at `https://dashboard.convex.dev`:

- **Functions**: View execution logs and errors
- **Data**: Browse and query database
- **Logs**: Real-time function logs
- **Usage**: Monitor API calls and storage

### 2. Performance Monitoring

```typescript
// Add timing to critical functions
export const timedVectorSearch = query({
  handler: async (ctx, args) => {
    const start = Date.now();
    
    const results = await vectorSearch(ctx, args);
    
    const duration = Date.now() - start;
    console.log(`Vector search took ${duration}ms for ${results.length} results`);
    
    return results;
  }
});
```

### 3. Error Monitoring

```typescript
// Implement error tracking
export const trackedFunction = action({
  handler: async (ctx, args) => {
    try {
      return await riskyOperation(args);
    } catch (error) {
      // Log to Convex logs
      console.error('Operation failed:', {
        error: error.message,
        args,
        timestamp: new Date().toISOString()
      });
      
      // Could also send to external service
      await notifyErrorService(error);
      
      throw error;
    }
  }
});
```

## Scaling Considerations

### 1. Vector Search Optimization

For large-scale deployments:

```typescript
// Implement tiered search
export const tieredVectorSearch = query({
  handler: async (ctx, args) => {
    // First: Check hot cache (most accessed)
    const hotResults = await searchHotVectors(ctx, args);
    if (hotResults.length >= args.limit) {
      return hotResults;
    }
    
    // Second: Search recent vectors
    const recentResults = await searchRecentVectors(ctx, args);
    if (hotResults.length + recentResults.length >= args.limit) {
      return [...hotResults, ...recentResults].slice(0, args.limit);
    }
    
    // Third: Full search
    return await fullVectorSearch(ctx, args);
  }
});
```

### 2. Embedding Cache

```typescript
// Implement embedding cache
const embeddingCache = new Map<string, EmbeddingResult>();

export const cachedGenerateEmbedding = action({
  handler: async (ctx, args) => {
    const cacheKey = `${args.model}:${args.text}`;
    
    // Check cache
    if (embeddingCache.has(cacheKey)) {
      return embeddingCache.get(cacheKey)!;
    }
    
    // Generate new
    const result = await generateEmbedding(args);
    
    // Cache with TTL
    embeddingCache.set(cacheKey, result);
    setTimeout(() => embeddingCache.delete(cacheKey), 3600000); // 1 hour
    
    return result;
  }
});
```

## Troubleshooting

### Common Issues

#### 1. "VOYAGE_AI_API_KEY is not set"

```bash
# Check if environment variable is set
npx convex env get VOYAGE_AI_API_KEY

# If not, set it
npx convex env set VOYAGE_AI_API_KEY "your-key"

# Restart dev server
npx convex dev
```

#### 2. TypeScript Errors

```bash
# Regenerate Convex types
npx convex codegen

# Clear TypeScript cache
rm -rf node_modules/.cache
npm run typecheck
```

#### 3. Deployment Failures

```bash
# Check deployment status
npx convex dashboard

# View detailed logs
npx convex logs --error

# Rollback if needed
npx convex deploy --prod --functions-version <previous-version>
```

#### 4. Rate Limiting

```typescript
// Implement rate limiting
const rateLimiter = new Map<string, number[]>();

export const rateLimitedAction = action({
  handler: async (ctx, args) => {
    const key = ctx.auth.userId || 'anonymous';
    const now = Date.now();
    const window = 60000; // 1 minute
    const limit = 100;
    
    const timestamps = rateLimiter.get(key) || [];
    const recent = timestamps.filter(t => t > now - window);
    
    if (recent.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
    
    recent.push(now);
    rateLimiter.set(key, recent);
    
    return await performAction(args);
  }
});
```

## Security Best Practices

### 1. API Key Management

- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly
- Use different keys for dev/staging/prod

### 2. Access Control

```typescript
// Implement authentication checks
export const secureQuery = query({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }
    
    // Additional role checks
    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('email'), identity.email))
      .first();
      
    if (!user?.roles?.includes('admin')) {
      throw new Error('Insufficient permissions');
    }
    
    return await performQuery(ctx, args);
  }
});
```

### 3. Input Validation

```typescript
// Validate all inputs
export const validateAndCreate = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Length validation
    if (args.title.length > 200) {
      throw new Error('Title too long');
    }
    
    // Content validation
    if (args.content.length > 50000) {
      throw new Error('Content too long');
    }
    
    // Sanitize input
    const sanitized = {
      title: sanitizeHtml(args.title),
      content: sanitizeHtml(args.content),
    };
    
    return await ctx.db.insert('documents', sanitized);
  }
});
```

## Backup and Recovery

### 1. Data Export

```bash
# Export all data
npx convex export --path ./backup-$(date +%Y%m%d)

# Export specific tables
npx convex export --tables documents,vectorMemories --path ./partial-backup
```

### 2. Data Import

```bash
# Import from backup
npx convex import --path ./backup-20240115

# Import with transformation
npx convex import --path ./backup --transform ./transform.js
```

### 3. Automated Backups

```bash
# Add to cron for daily backups
0 2 * * * cd /path/to/project && npx convex export --path ./backups/backup-$(date +\%Y\%m\%d)
```

## Conclusion

Your Convex RAG system is now ready for production use. Key points:

- ✅ Local development with hot reload
- ✅ Staging and production deployments
- ✅ CI/CD integration
- ✅ Monitoring and error tracking
- ✅ Security best practices
- ✅ Backup and recovery procedures

For additional help:
- [Convex Documentation](https://docs.convex.dev)
- [Convex Discord](https://discord.gg/convex)
- [Project Issues](https://github.com/your-repo/issues)