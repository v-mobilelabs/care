/**
 * Knowledge Base SDK Examples
 *
 * This file demonstrates common usage patterns for the KB SDK
 */

import { createKnowledgeBaseClient } from "./factory";

/**
 * Example 1: Create a medical knowledge base store and add documents
 */
export async function exampleCreateMedicalStore() {
  const client = createKnowledgeBaseClient();

  // Create a store for medical conditions
  const { store } = await client.createStore({
    name: "Medical Conditions Database",
    description: "Indexed collection of medical conditions",
    source: {
      id: "firestore-doc-id",
      collection: "conditions",
    },
  });

  console.log("Created store:", store.id);

  // Add a medical condition document
  const { document } = await client.createStoreDocument(store.id, {
    name: "Hypertension",
    source: {
      id: "condition-hypertension",
      collection: "conditions",
    },
    data: {
      icd10: "I10",
      prevalence: "33%",
      riskFactors: ["obesity", "age", "family-history"],
      firstLineTherapy: ["ACE-inhibitors", "ARBs"],
    },
    keywords: ["hypertension", "high-blood-pressure", "cardiovascular"],
  });

  console.log("Document status:", document.status); // "pending" until indexed
  return { store, document };
}

/**
 * Example 2: Create a conversation context
 */
export async function exampleCreateContext() {
  const client = createKnowledgeBaseClient();

  const { context } = await client.createContext({
    name: "Patient Consultation - John Doe",
    description: "Q&A context for patient consultation session",
    windowSize: 4000, // token window for conversation
  });

  console.log("Created context:", context.id);

  // Add documents representing conversation turns
  const { document: userQuery } = await client.addContextDocument(context.id, {
    role: "user",
    parts: [
      {
        type: "text",
        text: "I've been experiencing chest pain for 3 days",
      },
    ],
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });

  const { document: assistantResponse } = await client.addContextDocument(
    context.id,
    {
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Let me gather some more information about your symptoms...",
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
      },
    },
  );

  console.log("Added", 2, "documents to context");
  return { context, userQuery, assistantResponse };
}

/**
 * Example 3: Query a store
 */
export async function exampleQueryStore() {
  const client = createKnowledgeBaseClient();

  const results = await client.queryStore({
    storeId: "medical-conditions-store-id",
    query: "What are the symptoms of diabetes?",
    topK: 10,
    filters: {
      category: "endocrinology",
    },
  });

  console.log("Query results:", results);
  return results;
}

/**
 * Example 4: Manage session memory with auto-condensation
 */
export async function exampleCreateSessionMemory() {
  const client = createKnowledgeBaseClient();

  // Create a memory for the session
  const { memory } = await client.createMemory({
    description: "Session memory for patient consultation",
    documentCapacity: 50, // condense when reaching 50 docs
    condenseThresholdPercent: 70, // trigger at 70% capacity
  });

  console.log("Created memory:", memory.id);

  // Add consultation notes
  const notes = [
    "Patient reports chest pain onset 2 hours ago",
    "Pain radiates to left arm and jaw",
    "Associated with shortness of breath",
    "Vital signs: BP 145/95, HR 102, RR 20",
  ];

  for (const note of notes) {
    await client.addMemoryDocument(memory.id, {
      content: note,
      title: "Observation",
    });
  }

  // Retrieve all memory documents
  const { items } = await client.getMemoryDocuments(memory.id);
  console.log("Memory documents:", items.length);

  return memory;
}

/**
 * Example 5: Upload and manage files
 */
export async function exampleUploadFile() {
  const client = createKnowledgeBaseClient();

  // Note: In browser, use new File([content], filename, { type })
  // In Node.js, create a Blob and pass with filename
  const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes
  const blob = new Blob([pdfContent], { type: "application/pdf" });

  // Upload
  const { file: uploadedFile } = await client.uploadFile(
    blob,
    "patient-scan.pdf",
  );
  console.log("Uploaded file:", uploadedFile.id);

  // Get download URL (expires in 15 min)
  const { expiresIn } = await client.downloadFile(uploadedFile.id);
  console.log(`Download URL expires in ${expiresIn} seconds`);

  // Get thumbnail
  const { isImage, contentType } = await client.getFileThumbnail(
    uploadedFile.id,
  );
  console.log(`File is image: ${isImage}, MIME type: ${contentType}`);

  // Cleanup
  await client.deleteFile(uploadedFile.id);
  console.log("File deleted");

  return uploadedFile;
}

/**
 * Example 6: Complete workflow - Store + Context + Memory
 */
export async function exampleCompleteWorkflow() {
  const client = createKnowledgeBaseClient();

  // 1. Create a store for patient data
  const { store } = await client.createStore({
    name: "Patient Records",
    source: {
      id: "patient-123",
      collection: "patients",
    },
  });

  // 2. Add reference documents to the store
  await client.createStoreDocument(store.id, {
    name: "Previous Lab Results",
    source: {
      id: "lab-abc123",
      collection: "lab-reports",
    },
    data: {
      testDate: "2025-03-15",
      hemoglobin: 14.5,
      glucose: 95,
    },
    keywords: ["labs", "blood-work"],
  });

  // 3. Create a conversation context
  const { context } = await client.createContext({
    name: "Follow-up Consultation",
    windowSize: 3000,
  });

  // 4. Create session memory
  const { memory } = await client.createMemory({
    description: "Consultation session notes",
  });

  // 5. Add conversation turn to memory
  await client.addMemoryDocument(memory.id, {
    content: "Patient reports improved symptoms since medication change",
    title: "Chief Complaint",
  });

  // 6. Query the store
  const results = await client.queryStore({
    storeId: store.id,
    query: "patient symptoms",
    topK: 5,
  });

  console.log("Complete workflow executed successfully");
  console.log({
    storeId: store.id,
    contextId: context.id,
    memoryId: memory.id,
    queryResults: results,
  });

  return { store, context, memory, results };
}

/**
 * Example 7: Update a store document (triggers re-enrichment)
 */
export async function exampleUpdateDocument() {
  const client = createKnowledgeBaseClient();

  const storeId = "store-id";
  const documentId = "doc-id";

  // Update document data (this will trigger re-embedding/re-indexing)
  const { document } = await client.updateStoreDocument(storeId, documentId, {
    data: {
      prevalence: "35%", // updated value
      riskFactors: ["obesity", "age", "family-history", "sedentary-lifestyle"],
    },
    keywords: ["updated", "enriched"],
  });

  console.log("Document updated, status:", document.status); // "pending" for re-enrichment
  return document;
}

/**
 * Example 8: Paginated document retrieval
 */
export async function examplePaginatedRetrieval() {
  const client = createKnowledgeBaseClient();

  const storeId = "store-id";
  let cursor: string | null = null;
  const allDocuments: any[] = [];

  do {
    const { items, hasNext, nextCursor } =
      await client.getStoreDocuments(storeId);

    allDocuments.push(...items);
    console.log(`Retrieved ${items.length} documents`);

    if (hasNext && nextCursor) {
      cursor = nextCursor;
      // In the future, pass cursor to getStoreDocuments method
    } else {
      cursor = null;
    }
  } while (cursor);

  console.log(`Total documents retrieved: ${allDocuments.length}`);
  return allDocuments;
}

/**
 * Example 9: Error handling
 */
export async function exampleErrorHandling() {
  const client = createKnowledgeBaseClient({
    apiKey: "invalid-api-key",
  });

  try {
    await client.createContext({
      name: "Test",
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      // Example: "HTTP 401: Unauthorized"
    }
  }
}

/**
 * Example 10: Dynamic client configuration
 */
export async function exampleDynamicConfiguration() {
  const client = createKnowledgeBaseClient();

  // Set API key dynamically
  client.setApiKey(process.env.KB_API_KEY || "");

  // Or set user token for authenticated operations
  client.setUserToken(process.env.KB_USER_TOKEN || "");

  // Subsequent calls will use the updated credentials
  const health = await client.healthCheck();
  console.log("Health check:", health);

  return health;
}
