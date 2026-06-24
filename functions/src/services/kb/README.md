# Knowledge Base SDK

TypeScript SDK for the CosmoOps Knowledge Base API (`kb.cosmoops.com`). Provides type-safe access to contexts, stores, memories, files, and authentication endpoints.

## Installation

The SDK is already integrated into the services directory. Import from `@/services/kb`:

```typescript
import {
  createKnowledgeBaseClient,
  KnowledgeBaseClient,
  type Context,
  type StoreDocument,
} from "@/services/kb";
```

## Quick Start

### Creating a Client

```typescript
import { createKnowledgeBaseClient } from "@/services/kb";

// Using factory with environment variables
const client = createKnowledgeBaseClient({
  apiKey: process.env.KB_API_KEY,
});

// Or manually
const client = new KnowledgeBaseClient({
  baseURL: "https://kb.cosmoops.com",
  apiKey: "your-api-key",
  timeout: 30000,
});
```

### Environment Variables

- `KB_API_KEY` - API key for service-to-service authentication
- `KB_USER_TOKEN` - Firebase JWT token for user-authenticated endpoints
- `KB_BASE_URL` - Custom base URL (defaults to `https://kb.cosmoops.com`)

## API Reference

### Health Check

```typescript
const health = await client.healthCheck();
// { status: "ok" }
```

### Contexts

Contexts are conversation-like containers that hold role-based documents with optional token window management.

#### Create Context

```typescript
const { context } = await client.createContext({
  name: "Patient History",
  description: "Medical history context for patient John Doe",
  windowSize: 8000, // optional token window size
});
// context.id is now available
```

#### Add Document to Context

```typescript
const { document } = await client.addContextDocument(context.id, {
  role: "user",
  parts: [
    {
      type: "text",
      text: "I'm experiencing chest pain and shortness of breath",
    },
  ],
  metadata: { visitDate: "2025-04-15" },
});
```

#### Get Context Documents

```typescript
const { documents } = await client.getContextDocuments(context.id);
// documents.items: ContextDocument[]
// documents.hasNext: boolean
// documents.nextCursor: string | null
```

#### Delete Context Documents

```typescript
await client.deleteContextDocuments(context.id);
```

#### Delete Context

```typescript
await client.deleteContext(context.id);
```

### Stores

Stores are document collections with embedding/indexing capabilities. Documents track enrichment status (pending/completed/error).

#### Create Store

```typescript
const { store } = await client.createStore({
  name: "Medical Knowledge Base",
  description: "Curated medical reference data",
  source: {
    id: "firestore-collection-id",
    collection: "medical-documents",
  },
});
```

#### Create Store Document

```typescript
const { document } = await client.createStoreDocument(store.id, {
  name: "DIABETES-2025",
  source: {
    id: "doc-123",
    collection: "conditions",
  },
  data: {
    prevalence: "9.1%",
    icd10: "E11.9",
    categories: ["endocrine", "metabolic"],
  },
  keywords: ["diabetes", "glucose", "insulin"],
});
// document.status: "pending" | "completed" | "error"
```

#### Get Store Documents

```typescript
const { items, hasNext, nextCursor } = await client.getStoreDocuments(store.id);
```

#### Update Store Document

```typescript
const { document } = await client.updateStoreDocument(store.id, documentId, {
  data: {
    prevalence: "9.2%", // triggers re-enrichment
    icd10: "E11.9",
  },
});
```

#### Update Store

```typescript
const { store } = await client.updateStore(store.id, {
  description: "Updated description",
});
```

#### Delete Store

```typescript
await client.deleteStore(store.id);
```

### Query

Execute semantic search on a store.

```typescript
const results = await client.queryStore({
  storeId: store.id,
  query: "symptoms of diabetes",
  topK: 10,
  filters: {
    category: "endocrinology",
  },
  enableRagEvaluation: true,
});
// results.items: { [key: string]: unknown }[]
// results.hasNext: boolean
// results.nextCursor: string | null
```

### Memories

Memories store condensable documents for long-context conversation tracking.

#### Create Memory

```typescript
const { memory } = await client.createMemory({
  description: "Session memory for patient consultation",
  documentCapacity: 100,
  condenseThresholdPercent: 50,
});
```

#### Get Memory

```typescript
const { memory } = await client.getMemory(memory.id);
```

#### Add Document to Memory

```typescript
const { document } = await client.addMemoryDocument(memory.id, {
  content: "Patient reports chest pain onset 2 hours ago",
  title: "Chief Complaint",
});
```

#### Get Memory Documents

```typescript
const { items, hasNext, nextCursor } = await client.getMemoryDocuments(
  memory.id,
);
```

### Files

Upload/download/manage file assets with optional thumbnail generation.

#### Upload File

```typescript
const file = new File(["content"], "document.pdf", { type: "application/pdf" });

const { file: uploadedFile } = await client.uploadFile(file, "document.pdf");
// Max size: 50MB
```

#### Generate Download URL

```typescript
const { url, expiresIn } = await client.downloadFile(fileId);
// URL expires in 15 minutes
```

#### Get Thumbnail

```typescript
const { url, isImage, contentType, data } =
  await client.getFileThumbnail(fileId);
// url: signed URL for images
// data: base64 icon data for non-images
```

#### Delete File

```typescript
await client.deleteFile(fileId);
```

### Authentication

#### Send Magic Link

```typescript
const { success, message } = await client.sendMagicLink({
  email: "user@example.com",
  captchaToken: "recaptcha-v3-token", // optional
});
```

#### Auth Callback

```typescript
const { success, sessionCookie, user } = await client.authCallback({
  idToken: "firebase-id-token-from-magic-link",
});
// user includes: uid, email, orgId, role
```

### Profile

#### Get User Profile

```typescript
const { user } = await client.getUserProfile();
// Set userToken: await client.setUserToken(firebaseIdToken);
```

#### Update User Profile

```typescript
const { success, message } = await client.updateUserProfile({
  displayName: "John Doe",
  photoURL: "https://example.com/photo.jpg",
});
```

#### Delete User Account

```typescript
const { success, message } = await client.deleteUserAccount();
// Account deletion is asynchronous
```

## Error Handling

All errors are thrown as native JavaScript `Error` objects with descriptive messages:

```typescript
try {
  await client.uploadFile(file);
} catch (error) {
  if (error instanceof Error) {
    console.error("Upload failed:", error.message);
    // Example: "HTTP 413: Payload Too Large"
  }
}
```

## Authentication Methods

### API Key Authentication

Used for service-to-service communication:

```typescript
const client = new KnowledgeBaseClient({
  apiKey: process.env.KB_API_KEY,
});

// Automatically sends x-api-key header
```

### User Token Authentication

Used for user-specific operations (profile, etc):

```typescript
const client = new KnowledgeBaseClient();
client.setUserToken(firebaseIdToken);

await client.getUserProfile();
// Sends Authorization: Bearer <token>
```

## TypeScript Types

All request/response types are exported:

```typescript
import type {
  Context,
  ContextDocument,
  Store,
  StoreDocument,
  Memory,
  MemoryDocument,
  File,
  User,
  CreateContextRequest,
  CreateStoreRequest,
  QueryStoresRequest,
  // ... and many more
} from "@/services/kb";
```

## Configuration

```typescript
interface KnowledgeBaseClientConfig {
  baseURL?: string; // Default: https://kb.cosmoops.com
  apiKey?: string; // For API key auth
  userToken?: string; // For user token auth
  timeout?: number; // Default: 30000ms
}

const client = new KnowledgeBaseClient({
  apiKey: "your-api-key",
  timeout: 60000, // Longer timeout for file uploads
});
```

## Status Transitions

Store documents pass through these states during enrichment:

- **pending** - Queued for embedding and indexing
- **completed** - Successfully embedded and indexed
- **error** - Failed during enrichment (check `document.error` field)

Update operations on completed documents re-trigger enrichment.

## Response Pagination

List endpoints support cursor-based pagination:

```typescript
const { items, hasNext, nextCursor } = await client.getContextDocuments(id);

if (hasNext && nextCursor) {
  // Implement manual pagination by constructing query with cursor param
  // SDK will accept cursor parameter in future versions
}
```

## Timeouts

All requests default to 30s timeout. Adjust for long-running operations:

```typescript
const client = new KnowledgeBaseClient({
  timeout: 120000, // 2 minutes for bulk uploads
});
```

## API Base URL

Default: `https://kb.cosmoops.com`

Override for development:

```typescript
const client = new KnowledgeBaseClient({
  baseURL: process.env.KB_BASE_URL || "https://kb.cosmoops.com",
});
```
