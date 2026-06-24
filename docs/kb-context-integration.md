# KB Context Integration with Sessions

## Overview

When a new chat session is created, a corresponding **KB Context** is automatically created with the same ID. This allows the system to:
- Store and retrieve session-specific messages and tool outputs
- Build contextual knowledge bases for each conversation
- Enable context-aware RAG and continuity across chat turns

## Architecture

### Data Structure

```
kb_contexts/
├── {sessionId}                          (KB Context document)
│   ├── contextId: string                (same as session ID)
│   ├── userId: string                   (Firebase Auth UID)
│   ├── profileId: string                (patient/profile ID)
│   ├── sessionTitle: string             (session name for reference)
│   └── metadata:
│       ├── createdAt: Timestamp
│       ├── updatedAt: Timestamp
│       ├── messageCount: number
│       └── documentCount: number
│
└── documents/                           (subcollection)
    ├── {docId}
    │   ├── id: string (auto-generated)
    │   ├── role: "user" | "assistant"
    │   ├── content: string
    │   ├── timestamp: Timestamp
    │   └── toolOutputs?: Record<string, unknown>
    └── ...
```

## API Endpoints

### 1. Create Session with KB Context

**Endpoint:** `POST /api/sessions`

```typescript
// Request
{
  "id": "uuid-v4",
  "title": "Chat about diabetes management",
  "userId": "user-uid",
  "profileId": "profile-uid"
}

// Response
{
  "id": "uuid-v4",
  "title": "Chat about diabetes management",
  // ... session data
}

// Side effect: KB context automatically created with same ID
```

### 2. Get KB Context Documents

**Endpoint:** `GET /api/sessions/{sessionId}/kb/documents`

Retrieves all messages and documents stored in the KB context for a session.

```typescript
// Response
{
  "sessionId": "uuid-v4",
  "documents": [
    {
      "id": "doc-uuid",
      "role": "user",
      "content": "What are the symptoms of diabetes?",
      "timestamp": "2026-04-17T10:30:00Z",
      "toolOutputs": {}
    },
    {
      "id": "doc-uuid2",
      "role": "assistant",
      "content": "Common symptoms include increased thirst, frequent urination...",
      "timestamp": "2026-04-17T10:30:05Z",
      "toolOutputs": {
        "search_results": [...]
      }
    }
  ],
  "count": 2
}
```

### 3. Add Document to KB Context

**Endpoint:** `POST /api/sessions/{sessionId}/kb/documents`

Add a user message, assistant response, or tool output to the KB context.

```typescript
// Request
{
  "role": "user",
  "content": "What should my blood sugar target be?",
  "toolOutputs": {}
}

// Response
{
  "sessionId": "uuid-v4",
  "docId": "doc-uuid-new",
  "message": "Document added to KB context"
}
```

## Usage Patterns

### 1. Automatic KB Context Creation

```typescript
// When creating a session via API
const session = await new CreateSessionUseCase().execute({
  userId: "user-uid",
  profileId: "profile-uid",
  title: "New Chat",
  id: "session-uuid" // optional, will be generated if not provided
});

// KB context is automatically created with same ID as session
// No additional action needed!
```

### 2. Store Chat Turn in KB Context

```typescript
// After receiving a user message
await fetch(`/api/sessions/${sessionId}/kb/documents`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    role: "user",
    content: userMessage,
  }),
});

// After assistant responds
await fetch(`/api/sessions/${sessionId}/kb/documents`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    role: "assistant",
    content: assistantMessage,
    toolOutputs: {
      search_results: [...],
      condition_data: {...}
    },
  }),
});
```

### 3. Retrieve Context for RAG

```typescript
// Get all documents in the context
const response = await fetch(`/api/sessions/${sessionId}/kb/documents`);
const { documents } = await response.json();

// Use documents for context building in subsequent AI turns
const contextString = documents
  .map(doc => `[${doc.role.toUpperCase()}]: ${doc.content}`)
  .join("\n");

// Pass to AI pipeline for context-aware responses
```

### 4. Service-Level Usage

```typescript
import { kbContextService } from "@/data/knowledge-base";

// Add document
await kbContextService.addDocument(sessionId, {
  role: "assistant",
  content: "The patient's A1C is 7.2%",
  toolOutputs: { lab_data: {...} }
});

// Get all documents
const docs = await kbContextService.getDocuments(sessionId);

// Get context metadata
const context = await kbContextService.get(sessionId);
console.log(context.metadata.documentCount); // number of stored documents
```

## Key Benefits

1. **Session-Scoped Context** - Each session has its own isolated KB context
2. **Automatic Creation** - No manual KB context creation required
3. **Consistent IDs** - Session ID = Context ID for easy referencing
4. **Tool Output Storage** - Store search results, lab data, etc. alongside messages
5. **History Persistence** - Full chat history available for continuity
6. **Metadata Tracking** - Know how many documents are in context

## Integration with Chat Flow

```typescript
// In chat flow after message completion
1. Store user message in KB context
   → POST /api/sessions/{sessionId}/kb/documents

2. Get AI response from agent/LLM

3. Store assistant message in KB context (with tool outputs)
   → POST /api/sessions/{sessionId}/kb/documents

4. On next turn, retrieve context
   → GET /api/sessions/{sessionId}/kb/documents
   
5. Build context string for RAG injection into next AI turn
```

## Firestore Vector Indexes

For KB context semantic search (future enhancement), add:

```
Index Name: kb_context_documents_embedding
Collection: kb_contexts/{contextId}/documents
Fields:
  - embedding (Vector, 768 dimensions)
  - timestamp (Ascending)
```

## Example: Full Chat Lifecycle

```typescript
// 1. Create new session (KB context auto-created)
const session = await createSession({
  title: "Diabetes Management",
  id: v4()
});

// 2. User sends first message
await addKBDocument(session.id, {
  role: "user",
  content: "I'm having blood sugar spikes after meals"
});

// 3. AI responds
const response = await callAI({
  context: await getKBContext(session.id),
  query: "I'm having blood sugar spikes after meals"
});

// 4. Store assistant response with search results
await addKBDocument(session.id, {
  role: "assistant",
  content: response.text,
  toolOutputs: {
    search_results: response.evidence,
    recommendations: response.tools
  }
});

// 5. User asks follow-up
await addKBDocument(session.id, {
  role: "user",
  content: "What medications help with this?"
});

// 6. AI can now access full context for better response
const fullContext = await getKBContext(session.id);
// All previous messages + tool outputs available!
```

## Error Handling

- **Session not found**: Return 404 in KB operations
- **KB context creation fails**: Session creation continues (graceful degradation)
- **Document add fails**: Return 500 with error message
- **Retrieval fails**: Return 500 with appropriate error

## Future Enhancements

1. **Vector Embeddings** - Embed KB documents for semantic search
2. **Context Summarization** - Automatically summarize long contexts
3. **Context Branching** - Support conversation branches with separate contexts
4. **Context Expiration** - Auto-archive old contexts
5. **Cross-Session Context** - Query context from related sessions
