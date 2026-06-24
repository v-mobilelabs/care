# KB Context Message Persistence

This module adds message persistence to the function API chat using KB (Knowledge Base) context documents. Chat messages are automatically saved to KB for auditability, retrieval, and continuity across sessions.

## Overview

The implementation consists of three main components:

1. **Message Converter** (`message-converter.service.ts`) — Converts AI SDK UIMessages to KB context document format
2. **KB Context Service** (`kb-context.service.ts`) — Manages KB API interactions and context lifecycle
3. **Save Use Case** (`save-chat-messages.use-case.ts`) — Business logic for persisting messages

## Architecture

```
Function API Chat Route
    ↓
Chat Service (streamChatToResponse)
    ↓
Router Agent (processes messages)
    ↓
[Stream to Client]
    ↓
onFinish Callback
    ↓
saveChatMessagesToKB Use Case
    ↓
KBContextService
    ↓
KB API (addContextDocument)
```

## How It Works

### 1. Message Conversion

Messages are converted from AI SDK format to KB context documents:

```
UIMessage {
  id: "msg-1",
  role: "user",
  content: "What are my medications?"
}
    ↓
AddContextDocumentRequest {
  role: "user",
  parts: [
    { type: "text", content: "What are my medications?" }
  ],
  metadata: {
    userId: "user-123",
    contextId: "session-456",
    messageId: "msg-1"
  }
}
```

### 2. Context Management

Each chat conversation gets a KB context:

- **Creation**: Automatic on first message save (cached locally)
- **Naming**: `Chat Context: {contextId}`
- **Window Size**: Last 100 messages kept (configurable)

### 3. Automatic Persistence

Messages are saved **after** streaming completes:

- All messages from the conversation are persisted
- Errors don't block chat flow (non-blocking)
- Results logged for monitoring

## Usage

### Basic Usage (Automatic)

Chat messages are automatically persisted when using the function API:

```bash
# POST /api/v1/chat
curl -X POST https://api.care.cosmoops.com/api/v1/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "id": "m1", "role": "user", "content": "I have a headache" }
    ]
  }'
# Messages automatically saved to KB after response streams
```

### Programmatic Usage

```typescript
import { saveChatMessagesToKB } from "@/use-cases/save-chat-messages.use-case";

// Save multiple messages
const result = await saveChatMessagesToKB({
  userId: "user-123",
  contextId: "session-456",
  messages: [
    { id: "m1", role: "user", content: "..." },
    { id: "m2", role: "assistant", content: "..." },
  ],
  includeMetadata: true,
});

console.log(`Saved: ${result.saved}, Failed: ${result.failed}`);
console.log(`Document IDs: ${result.documentIds}`);
```

### Service Usage

```typescript
import { getKBContextService } from "@/services/chat/kb-context.service";

const service = getKBContextService({
  apiKey: process.env.KB_API_KEY,
});

// Ensure context exists
const contextId = await service.ensureContext("session-456");

// Add a message
const docId = await service.addMessage("session-456", {
  role: "user",
  parts: [{ type: "text", content: "..." }],
  metadata: { userId: "user-123" },
});

// Retrieve messages
const response = await service.getMessages("session-456");
```

## Configuration

### Environment Variables

```bash
# KB API endpoint
KB_BASE_URL=https://kb.cosmoops.com

# KB API key for authentication
KB_API_KEY=your-api-key

# Request timeout (ms)
KB_CONTEXT_TIMEOUT=30000
```

### Runtime Configuration

```typescript
const service = getKBContextService({
  baseURL: "https://kb.cosmoops.com",
  apiKey: process.env.KB_API_KEY,
  timeout: 30000,
});
```

## Message Structure

### KB Context Document

Each message is stored as an `AddContextDocumentRequest`:

```typescript
interface AddContextDocumentRequest {
  role: "user" | "assistant" | "system";
  parts: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}
```

### Parts Types

```
Text Part:
{
  type: "text",
  content: "The actual message content"
}

Tool Invocation Part:
{
  type: "tool-invocation",
  toolName: "diagnosis_tool",
  toolCallId: "call-123",
  args: { ... },
  result: { ... }
}

Usage Part:
{
  type: "usage",
  usage: { promptTokens: 100, completionTokens: 50 }
}
```

### Metadata

```typescript
metadata: {
  userId: "user-123",           // User ID
  contextId: "session-456",     // Chat session/conversation ID
  messageId: "msg-789",         // AI SDK message ID
  timestamp: "2026-04-17T...",  // Creation time (ISO-8601)
  original?: UIMessage          // (Optional) Full original message
}
```

## Error Handling

### Non-Blocking Failures

Message persistence errors don't block the chat:

```typescript
// Chat completes successfully
// Persistence error is logged but not thrown

logger.warn("[Chat Persistence Errors]", {
  userId: "user-123",
  contextId: "session-456",
  errors: [
    { index: 0, error: "Failed to add message" }
  ]
});
```

### Monitoring

Check logs for persistence status:

```
[Chat Stream Finished] — Chat completed
[Chat Messages Persisted to KB] — Messages saved
[Chat Persistence Errors] — Any save failures
[Chat Message Persistence Failed] — Batch operation failed
```

## Performance

### Timing

- **Message conversion**: ~1ms per message
- **KB API call**: ~200-500ms per batch (network dependent)
- **Context creation**: ~100-200ms (cached after first call)
- **Total persistence**: Non-blocking (runs after stream completes)

### Batch Operations

Messages are saved sequentially to maintain order:

```typescript
// For 5 messages:
// Message 1: ~300ms
// Message 2: ~200ms
// Message 3: ~250ms
// Message 4: ~200ms
// Message 5: ~150ms
// Total: ~1.1s (non-blocking)
```

## Retrieval

### Get All Messages for a Context

```typescript
const service = getKBContextService();
const response = await service.getMessages("session-456");

response.documents.items.forEach(doc => {
  console.log(`[${doc.role}] ${doc.parts[0].content}`);
});
```

### Search Messages

Use KB's native vector search (separate API):

```typescript
// Retrieve context messages, then search
const docs = await service.getMessages("session-456");
const relevant = docs.documents.items.filter(doc => 
  doc.parts[0].content?.includes("medication")
);
```

## Testing

### Unit Tests

```typescript
import { ChatMessageConverter } from "@/services/chat/message-converter.service";

const doc = ChatMessageConverter.toContextDocument(
  { id: "m1", role: "user", content: "test" },
  { userId: "u1", contextId: "c1" }
);

expect(doc.role).toBe("user");
expect(doc.parts[0].content).toBe("test");
```

### Integration Tests

```typescript
import { saveChatMessagesToKB } from "@/use-cases/save-chat-messages.use-case";

const result = await saveChatMessagesToKB({
  userId: "test-user",
  contextId: "test-session",
  messages: [/* test messages */],
});

expect(result.saved).toBeGreaterThan(0);
```

## Migration & Rollback

### Enabling

Messages are automatically persisted once deployed. No migration needed.

### Disabling

Remove the `onFinish` callback in `chat.service.ts` if needed:

```typescript
// Comment out to disable persistence:
// await saveChatMessagesToKB({ ... });
```

## Future Enhancements

- [ ] Batch save with configurable size
- [ ] Message retention policies
- [ ] Compression for long conversations
- [ ] Real-time indexing for search
- [ ] Export messages to file
- [ ] Message annotations (clinical notes)

## References

- [KB API Documentation](https://kb.cosmoops.com/docs)
- [AI SDK UIMessage](https://ai-sdk.vercel.app)
- [Context Documents](./types.ts)

## Support

For issues or questions:

1. Check logs: `[Chat Messages Persisted to KB]`
2. Review KB API status
3. Verify API key and network connectivity
4. See examples in `save-chat-messages.examples.ts`
