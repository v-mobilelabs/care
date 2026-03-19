---
name: data-layer
description: "**DATA LAYER SKILL** — Firestore data access patterns: Model, Repository, Service, UseCase, API routes, pagination, search, sort, caching, and error handling. USE FOR: creating new data domains; CRUD operations; Firestore queries; cursor-based pagination; search and sort; API route handlers; SSR caching with 'use cache'; RAG indexing via @Indexable; multi-tenant dependent data; Zod validation; barrel exports. DO NOT USE FOR: frontend UI components; AI/chat pipeline; authentication flows; Mantine styling."
---

# Data Layer — Firestore Access Patterns

## Golden Rules

1. **Domain folder structure** — every domain lives in `src/data/{domain}/` with 4 subdirectories: `models/`, `repositories/`, `service/`, `use-cases/`, plus a barrel `index.ts`.
2. **Import from barrel** — API routes and consumers import from `@/data/{domain}`, never deep-import internal files.
3. **Scoped collections** — all health data lives under `profiles/{profileId}/{collection}` via `scopedCol()`. The `profileId` is `dependentId ?? userId`.
4. **dependentId threading** — flows through every layer: API route → UseCase constructor → Service → Repository. Never forget to propagate it.
5. **stripUndefined before every Firestore write** — Firestore rejects `undefined` values. Always call `stripUndefined(doc)` before `.set()` or `.add()`.
6. **UseCase is the entry point** — API routes and server actions always call use cases, never services or repositories directly.
7. **RAG indexing is automatic** — use the `@Indexable` decorator on create/delete use cases. Never call `ragService` manually from use cases.
8. **Zod validates at the boundary** — the UseCase base class auto-validates via `static validate()`. Don't validate again in services or repositories.

---

## Architecture Overview

```
API Route / Server Action
  ↓ calls
UseCase (validates input via Zod, wraps in OTel span, auto-indexes via @Indexable)
  ↓ delegates to
Service (optional orchestration — cross-cutting logic, enrichment, multi-repo coordination)
  ↓ calls
Repository (direct Firestore access — queries, writes, reads)
  ↓ uses
Model (Document interface, DTO, mapper, Zod schemas)
```

### When to use each layer

| Layer          | Required? | When to use                                                                              |
| -------------- | --------- | ---------------------------------------------------------------------------------------- |
| **Model**      | Always    | Every domain needs types + schemas                                                       |
| **Repository** | Always    | Every domain needs Firestore access                                                      |
| **Service**    | Optional  | Only when: cross-repo coordination, enrichment, or cleanup logic (e.g., Firestore + RAG) |
| **UseCase**    | Always    | Every operation exposed to API routes or server actions                                  |

If a domain is simple CRUD with no cross-cutting concerns, the UseCase can call the Repository directly — skip the Service layer.

---

## Domain Folder Structure

```
src/data/{domain}/
├── index.ts                              # Barrel exports
├── models/
│   └── {entity}.model.ts                 # Document, DTO, mapper, Zod schemas
├── repositories/
│   └── {entity}.repository.ts            # Firestore access (singleton object)
├── service/
│   └── {entity}.service.ts               # Orchestration (class + singleton instance)
└── use-cases/
    ├── create-{entity}.use-case.ts       # @Indexable for RAG
    ├── list-{entity}s.use-case.ts
    ├── get-{entity}.use-case.ts
    └── delete-{entity}.use-case.ts       # @Indexable({ remove: true })
```

---

## 1. Model Layer

**File**: `src/data/{domain}/models/{entity}.model.ts`

Every model file contains four sections:

1. **Firestore Document interface** — raw database shape with `Timestamp` fields
2. **DTO interface** — API response shape with ISO-8601 strings, always includes `id`
3. **Mapper function** — `to{Entity}Dto(id, doc)` converts Document → DTO
4. **Zod schemas + type aliases** — one schema per operation

### Template

```ts
import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface AllergyDocument {
  userId: string;
  name: string;
  nameLower: string; // For case-insensitive search/duplicate detection
  severity: "mild" | "moderate" | "severe";
  reaction: string;
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface AllergyDto {
  id: string;
  userId: string;
  name: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string;
  createdAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toAllergyDto(id: string, doc: AllergyDocument): AllergyDto {
  return {
    id,
    userId: doc.userId,
    name: doc.name,
    severity: doc.severity,
    reaction: doc.reaction,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateAllergySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  name: z.string().min(1),
  severity: z.enum(["mild", "moderate", "severe"]),
  reaction: z.string().min(1),
});

export type CreateAllergyInput = z.infer<typeof CreateAllergySchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListAllergiesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListAllergiesInput = z.infer<typeof ListAllergiesSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteAllergySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  allergyId: z.string().min(1, { message: "allergyId is required" }),
});

export type DeleteAllergyInput = z.infer<typeof DeleteAllergySchema>;
```

### Conventions

- **nameLower** — store alongside `name` for case-insensitive duplicate detection. Query on `nameLower`, display `name`.
- **Timestamp vs string** — Documents use `Timestamp` from `firebase-admin/firestore`. DTOs use ISO-8601 strings. The mapper converts via `doc.createdAt.toDate().toISOString()`.
- **limit defaults** — always provide `.default(50)` on limit fields so callers can omit it.
- **userId is always required** — even though it comes from the auth context, the schema validates it to ensure type safety.
- **DTO always has `id`** — the Firestore document ID is added by the mapper, not stored in the document itself.

---

## 2. Repository Layer

**File**: `src/data/{domain}/repositories/{entity}.repository.ts`

Repositories are exported as **singleton plain objects** (not classes). They handle all direct Firestore access.

### Template — Scoped Collection (health data under profiles)

```ts
import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toAllergyDto,
  type AllergyDocument,
  type AllergyDto,
} from "../models/allergy.model";
import { ApiError } from "@/lib/api/with-context";

const allergiesCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "allergies");

export const allergyRepository = {
  async existsByName(
    userId: string,
    name: string,
    dependentId?: string,
  ): Promise<boolean> {
    const snap = await allergiesCol(userId, dependentId)
      .where("nameLower", "==", name.toLowerCase())
      .limit(1)
      .get();
    return !snap.empty;
  },

  async create(
    userId: string,
    data: Omit<AllergyDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<AllergyDto> {
    const isDuplicate = await allergyRepository.existsByName(
      userId,
      data.name,
      dependentId,
    );
    if (isDuplicate) {
      throw ApiError.conflict(`Allergy "${data.name}" already exists.`);
    }
    const now = Timestamp.now();
    const doc: AllergyDocument = {
      userId,
      ...data,
      nameLower: data.name.toLowerCase(),
      createdAt: now,
    };
    const ref = allergiesCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toAllergyDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<AllergyDto[]> {
    const snap = await allergiesCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toAllergyDto(d.id, d.data() as AllergyDocument),
    );
  },

  async delete(
    userId: string,
    allergyId: string,
    dependentId?: string,
  ): Promise<void> {
    await allergiesCol(userId, dependentId).doc(allergyId).delete();
  },
};
```

### Template — Top-Level Collection (non-scoped, e.g., shared/global data)

```ts
import { db } from "@/lib/firebase/admin";

const col = db.collection("doctor_patients");
const docId = (doctorId: string, patientId: string) =>
  `${doctorId}_${patientId}`;
const docRef = (doctorId: string, patientId: string) =>
  col.doc(docId(doctorId, patientId));

export const doctorPatientRepository = {
  async listByDoctor(doctorId: string, status?: string) {
    const base = col.where("doctorId", "==", doctorId);
    const query = status
      ? base.where("status", "==", status).orderBy("invitedAt", "desc")
      : base.orderBy("invitedAt", "desc");
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
  },
};
```

### Key Patterns

| Pattern                 | Implementation                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Scoped collection**   | `scopedCol(dependentId ?? userId, "collection")` → `profiles/{profileId}/{collection}` |
| **Auto-generate ID**    | `const ref = col.doc();` then `ref.set(doc)` — Firestore generates the ID              |
| **Composite key**       | `col.doc(\`${doctorId}_${patientId}\`)` for relationship collections                   |
| **Duplicate detection** | `existsByName()` using `nameLower` field + `.limit(1)`                                 |
| **Strip undefined**     | `await ref.set(stripUndefined(doc))` — always before Firestore writes                  |
| **Timestamp**           | `Timestamp.now()` for `createdAt` and `updatedAt` fields                               |
| **Returns DTOs**        | Every method calls the mapper — repositories don't return raw Documents                |
| **Error on conflict**   | `throw ApiError.conflict("message")` when duplicate detected                           |
| **Error on not found**  | `throw ApiError.notFound("message")` when `!snap.exists`                               |

---

## 3. Service Layer

**File**: `src/data/{domain}/service/{entity}.service.ts`

Services are exported as **class + singleton instance**. They are optional — only needed when there's orchestration logic beyond simple delegation.

### When to use a Service

| Scenario                                | Use Service?                           | Example                                                        |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Simple CRUD pass-through                | No — UseCase calls Repository directly | Conditions, vitals                                             |
| Cross-cutting cleanup (Firestore + RAG) | **Yes**                                | Prescriptions (delete from Firestore + remove from RAG index)  |
| Multi-repository coordination           | **Yes**                                | Messages (save message + bump session counter)                 |
| Batch enrichment from other collections | **Yes**                                | Doctor-patients (fetch profile photos alongside relationships) |

### Template — Simple Service

```ts
import { allergyRepository } from "../repositories/allergy.repository";
import type {
  CreateAllergyInput,
  ListAllergiesInput,
  DeleteAllergyInput,
  AllergyDto,
} from "../models/allergy.model";

export class AllergyService {
  async create(
    input: CreateAllergyInput,
    dependentId?: string,
  ): Promise<AllergyDto> {
    return allergyRepository.create(
      input.userId,
      { name: input.name, severity: input.severity, reaction: input.reaction },
      dependentId,
    );
  }

  async list(
    input: ListAllergiesInput,
    dependentId?: string,
  ): Promise<AllergyDto[]> {
    return allergyRepository.list(input.userId, input.limit, dependentId);
  }

  async delete(input: DeleteAllergyInput, dependentId?: string): Promise<void> {
    await allergyRepository.delete(input.userId, input.allergyId, dependentId);
  }
}

export const allergyService = new AllergyService();
```

### Template — Service with Cross-Cutting Concerns

```ts
import { allergyRepository } from "../repositories/allergy.repository";
import { ragService } from "@/data/shared/service/rag/rag.service";

export class AllergyService {
  async deleteByFileId(
    userId: string,
    profileId: string,
    fileId: string,
    dependentId?: string,
  ): Promise<void> {
    const allergy = await allergyRepository.findByFileId(
      userId,
      fileId,
      dependentId,
    );
    if (!allergy) return;

    // Parallel: delete from Firestore AND remove from RAG index
    await Promise.all([
      allergyRepository.delete(userId, allergy.id, dependentId),
      ragService.removeDocument({ userId, profileId, sourceId: allergy.id }),
    ]);
  }
}

export const allergyService = new AllergyService();
```

### Conventions

- Exported as **class + singleton**: `export const allergyService = new AllergyService()`
- Services **never validate input** — that's the UseCase's job via Zod
- Constructor injection is supported for testing: `new AllergyService(mockRepo)`
- Services can call multiple repositories and external services (RAG, AI, etc.)
- Use `Promise.all()` for independent parallel operations

---

## 4. UseCase Layer

**File**: `src/data/{domain}/use-cases/{action}-{entity}.use-case.ts`

Every use case extends `UseCase<TInput, TOutput>` which provides:

- **Auto-validation** via `static validate()` (called by `execute()`)
- **OpenTelemetry span** wrapping (span name = class name)
- **@Indexable auto-indexing** — fire-and-forget RAG indexing after `run()` returns

### Template — Create (with RAG indexing)

```ts
import {
  allergyService,
  type AllergyService,
} from "../service/allergy.service";
import {
  CreateAllergySchema,
  type CreateAllergyInput,
  type AllergyDto,
} from "../models/allergy.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "allergy",
  contentFields: ["name", "severity", "reaction"],
  sourceIdField: "id",
  metadataFields: ["severity", "createdAt"],
})
export class CreateAllergyUseCase extends UseCase<
  CreateAllergyInput,
  AllergyDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AllergyService = allergyService,
  ) {
    super();
  }

  static validate(input: unknown): CreateAllergyInput {
    return CreateAllergySchema.parse(input);
  }

  protected async run(input: CreateAllergyInput): Promise<AllergyDto> {
    return this.service.create(input, this.dependentId);
  }
}
```

### Template — List

```ts
import {
  allergyService,
  type AllergyService,
} from "../service/allergy.service";
import {
  ListAllergiesSchema,
  type ListAllergiesInput,
  type AllergyDto,
} from "../models/allergy.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListAllergiesUseCase extends UseCase<
  ListAllergiesInput,
  AllergyDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AllergyService = allergyService,
  ) {
    super();
  }

  static validate(input: unknown): ListAllergiesInput {
    return ListAllergiesSchema.parse(input);
  }

  protected async run(input: ListAllergiesInput): Promise<AllergyDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
```

### Template — Delete (with RAG removal)

```ts
import {
  allergyService,
  type AllergyService,
} from "../service/allergy.service";
import {
  DeleteAllergySchema,
  type DeleteAllergyInput,
} from "../models/allergy.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "allergyId", remove: true })
export class DeleteAllergyUseCase extends UseCase<DeleteAllergyInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AllergyService = allergyService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteAllergyInput {
    return DeleteAllergySchema.parse(input);
  }

  protected async run(input: DeleteAllergyInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
```

### @Indexable Decorator

Marks a UseCase for automatic RAG indexing. Applied to the class, runs after `run()` returns.

**Create/Update mode** (index document):

```ts
@Indexable({
  type: "allergy",                             // DocumentChunk.type for vector metadata
  contentFields: ["name", "severity", "reaction"],  // Fields to embed
  sourceIdField: "id",                          // Property on result holding doc ID
  sourceIdPrefix: "profile",                    // Optional: prepends "profile:" to sourceId
  metadataFields: ["severity", "createdAt"],    // Optional: stored in vector metadata
})
```

**Delete mode** (remove from index):

```ts
@Indexable({ sourceIdField: "allergyId", remove: true })
```

Context is derived automatically:

- `userId` = `input.userId`
- `profileId` = `this.dependentId ?? input.profileId ?? input.userId`
- `dependentId` = from UseCase constructor

### Naming Conventions

| Action | Class Name              | File Name                     |
| ------ | ----------------------- | ----------------------------- |
| Create | `Create{Entity}UseCase` | `create-{entity}.use-case.ts` |
| List   | `List{Entity}sUseCase`  | `list-{entity}s.use-case.ts`  |
| Get    | `Get{Entity}UseCase`    | `get-{entity}.use-case.ts`    |
| Update | `Update{Entity}UseCase` | `update-{entity}.use-case.ts` |
| Delete | `Delete{Entity}UseCase` | `delete-{entity}.use-case.ts` |

---

## 5. Barrel Exports

**File**: `src/data/{domain}/index.ts`

Re-exports everything consumers need. Group by section:

```ts
// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/allergy.model";

// ── Repository ────────────────────────────────────────────────────────────────
export { allergyRepository } from "./repositories/allergy.repository";

// ── Service ───────────────────────────────────────────────────────────────────
export { allergyService, AllergyService } from "./service/allergy.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateAllergyUseCase } from "./use-cases/create-allergy.use-case";
export { ListAllergiesUseCase } from "./use-cases/list-allergies.use-case";
export { DeleteAllergyUseCase } from "./use-cases/delete-allergy.use-case";
```

Consumers import from the barrel:

```ts
import {
  CreateAllergyUseCase,
  ListAllergiesUseCase,
  type AllergyDto,
} from "@/data/allergies";
```

---

## 6. API Route Integration

**File**: `src/app/api/{resource}/route.ts` and `src/app/api/{resource}/[{id}]/route.ts`

All routes are wrapped with `WithContext` which handles authentication, dependent resolution, and error handling automatically.

### Template — Collection Route (GET + POST)

```ts
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateAllergyUseCase, ListAllergiesUseCase } from "@/data/allergies";

// GET /api/allergies — list all allergies for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const allergies = await new ListAllergiesUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(allergies);
});

// POST /api/allergies — create a new allergy
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const allergy = await new CreateAllergyUseCase(dependentId).execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(allergy, { status: 201 });
});
```

### Template — Individual Route (GET + DELETE)

```ts
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteAllergyUseCase } from "@/data/allergies";

// DELETE /api/allergies/[allergyId]
export const DELETE = WithContext<{ allergyId: string }>(
  async ({ user, dependentId }, { allergyId }) => {
    await new DeleteAllergyUseCase(dependentId).execute({
      userId: user.uid,
      allergyId,
    });
    return NextResponse.json({ ok: true });
  },
);
```

### WithContext Patterns

```ts
// Any authenticated user
export const GET = WithContext(handler);

// Doctors only
export const GET = WithContext({ kind: "doctor" }, handler);

// Route params via generic type
export const DELETE = WithContext<{ allergyId: string }>(
  async (ctx, { allergyId }) => { ... }
);
```

### ApiContext (provided to handlers)

```ts
interface ApiContext {
  user: SessionPayload; // { uid, email, kind: "doctor" | "user" }
  req: NextRequest;
  dependentId?: string; // From X-Dependent-Id header
  profileId: string; // Resolved: dependentId ?? user.uid
}
```

### Query Parameters

```ts
export const GET = WithContext(async ({ user, req, dependentId }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as AllergyStatus | null;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const result = await new ListAllergiesUseCase(dependentId).execute({
    userId: user.uid,
    ...(status && { status }),
    ...(limit && { limit }),
    ...(cursor && { cursor }),
  });
  return NextResponse.json(result);
});
```

---

## 7. Pagination

Cursor-based pagination using Firestore timestamps. The pattern: fetch `limit + 1` docs, check if there's a next page, return `nextCursor` for the client.

### Model — Paginated Response

```ts
export interface PaginatedAllergies {
  allergies: AllergyDto[];
  nextCursor: string | null; // ISO-8601 timestamp, or null when no more pages
}

export const ListAllergiesSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(), // ISO-8601 timestamp from previous response
});
```

### Repository — Cursor-Based Query

```ts
async list(
  userId: string,
  limit: number,
  cursor?: string,
  dependentId?: string,
): Promise<PaginatedAllergies> {
  let query = allergiesCol(userId, dependentId).orderBy("createdAt", "desc");

  if (cursor) {
    query = query.startAfter(Timestamp.fromDate(new Date(cursor)));
  }

  // Fetch one extra to determine if there's a next page
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs as QueryDocumentSnapshot[];
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  const allergies = page.map((d) =>
    toAllergyDto(d.id, d.data() as AllergyDocument),
  );

  const nextCursor = hasMore
    ? allergies[allergies.length - 1].createdAt  // last item's timestamp
    : null;

  return { allergies, nextCursor };
},
```

### API Route — Passing Cursor

```ts
export const GET = WithContext(async ({ user, req, dependentId }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await new ListAllergiesUseCase(dependentId).execute({
    userId: user.uid,
    ...(cursor && { cursor }),
    ...(limit && { limit }),
  });
  return NextResponse.json(result);
});
```

### Client — TanStack Query Infinite Query

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteQuery({
    queryKey: ["allergies"],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginatedAllergies>(
        `/api/allergies?${new URLSearchParams({
          ...(pageParam && { cursor: pageParam }),
        })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

// Flatten pages for rendering
const allergies = data?.pages.flatMap((p) => p.allergies) ?? [];
```

### Key Points

- **Cursor = ISO-8601 timestamp** from the last item of the previous page
- Fetch `limit + 1` — if you get more than `limit`, there's a next page
- `nextCursor = null` means no more data
- For **reverse chronological** (newest first), the cursor points to the oldest item on the page
- For **reverse display** (oldest first, like chat messages), reverse after fetching: `page.reverse()`

---

## 8. Search

Firestore has no full-text search. Use these patterns:

### Prefix Range Query

Matches names that start with the search term:

```ts
async search(query: string, limit = 20): Promise<AllergyDto[]> {
  const term = query.trim();
  const snap = await db
    .collection("profiles")
    .where("name", ">=", term)
    .where("name", "<=", term + "\uf8ff")  // \uf8ff = last Unicode char
    .limit(limit)
    .get();
  return snap.docs.map((d) => toAllergyDto(d.id, d.data() as AllergyDocument));
}
```

### Case-Insensitive Duplicate Detection

Store a lowercase version of the searchable field:

```ts
// On create:
const doc = { ...data, nameLower: data.name.toLowerCase() };

// On query:
async existsByName(userId: string, name: string): Promise<boolean> {
  const snap = await col
    .where("nameLower", "==", name.toLowerCase())
    .limit(1)
    .get();
  return !snap.empty;
}
```

### Exact Field Lookup

```ts
async findByFileId(userId: string, fileId: string): Promise<AllergyDto | null> {
  const snap = await col
    .where("fileId", "==", fileId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return toAllergyDto(d.id, d.data() as AllergyDocument);
}
```

### Limitations

- No `LIKE` or substring search — only prefix match via range queries
- Case-sensitive unless you store + query on a `nameLower` field
- Complex text search requires an external service (Algolia, Typesense)

---

## 9. Sort

Sorting is **fixed in repositories** — not exposed as an API parameter.

### Default Convention

```ts
// Most domains — newest first
.orderBy("createdAt", "desc")

// Vitals — by measurement time
.orderBy("measuredAt", "desc")

// Sessions — by last activity
.orderBy("updatedAt", "desc")

// Relationships — by invite date
.orderBy("invitedAt", "desc")
```

### Firestore Index Requirements

Every `where()` + `orderBy()` combination requires a **composite index** in `firestore.indexes.json`:

```json
{
  "collectionGroup": "allergies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

If you get a gRPC code 9 error ("The query requires an index"), add the index to `firestore.indexes.json` and deploy with `firebase deploy --only firestore:indexes`.

### Client-Controlled Sort (when needed)

If the API needs to support dynamic sorting, add sort params to the schema:

```ts
export const ListAllergiesSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(["createdAt", "name", "severity"]).optional().default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

// In repository:
async list(userId: string, limit: number, sortBy: string, sortDir: string) {
  return col.orderBy(sortBy, sortDir).limit(limit).get();
}
```

---

## 10. SSR Caching

Next.js 16 `"use cache"` with per-user cache tags for on-demand invalidation.

### Cached Data Function (`src/data/cached.ts`)

```ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export const CacheTags = {
  // ... existing tags ...
  allergies: (userId: string) => `allergies:${userId}`,
} as const;

export async function getCachedAllergies(userId: string) {
  "use cache";
  cacheTag(CacheTags.allergies(userId));
  cacheLife("minutes"); // stale 5min, revalidate 1min, expire 1hr

  const { ListAllergiesUseCase } = await import("@/data/allergies");
  return new ListAllergiesUseCase().execute({ userId });
}
```

### Server Action for Invalidation (`src/data/actions.ts`)

```ts
export async function revalidateAllergies() {
  const uid = await requireUserId();
  updateTag(CacheTags.allergies(uid));
}
```

### SSR Layout Prefetch + Hydration

```tsx
// In a server component layout:
import { getCachedAllergies } from "@/data/cached";
import { getServerUser } from "@/lib/api/server-prefetch";

export default async function Layout({ children }) {
  const user = await getServerUser();
  if (!user) redirect("/auth/login");

  const allergies = await getCachedAllergies(user.uid);
  // Hydrate into TanStack Query via setQueryData in a client wrapper
  return <AllergyProvider initialData={allergies}>{children}</AllergyProvider>;
}
```

### Client-Side Invalidation After Mutation

```ts
// After successful create/delete mutation:
await revalidateAllergies(); // Bust server cache
queryClient.invalidateQueries({ queryKey: ["allergies"] }); // Bust client cache
```

---

## 11. Error Handling

### ApiError (from `@/lib/api/with-context`)

```ts
import { ApiError } from "@/lib/api/with-context";

// Static factory methods:
ApiError.badRequest("Invalid input"); // 400
ApiError.unauthorized("Not logged in"); // 401
ApiError.forbidden("Doctor access required"); // 403
ApiError.notFound("Allergy not found"); // 404
ApiError.conflict("Allergy already exists"); // 409
ApiError.internal("Something went wrong"); // 500
```

### Where Errors Are Thrown

| Layer                  | Error Type                     | Example                                                    |
| ---------------------- | ------------------------------ | ---------------------------------------------------------- |
| **UseCase validation** | `ZodError` (auto-caught → 400) | `CreateAllergySchema.parse(input)` — requires no try/catch |
| **Repository**         | `ApiError.conflict()`          | Duplicate detection: `existsByName()`                      |
| **Repository**         | `ApiError.notFound()`          | `if (!snap.exists) throw ApiError.notFound(...)`           |
| **WithContext**        | `CreditsExhaustedError` → 402  | AI operations that consume credits                         |
| **Firestore**          | gRPC code 9 → 503              | Missing composite index (auto-caught by WithContext)       |

### Response Format

All errors are returned as:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Allergy \"Peanuts\" already exists."
  }
}
```

---

## 12. Shared Utilities

### `scopedCol(profileId, collection)` — `@/data/shared/repositories/scoped-col`

Returns a Firestore collection reference scoped to a profile:

```ts
// profiles/{profileId}/{collection}
scopedCol(dependentId ?? userId, "allergies");
```

### `stripUndefined(doc)` — `@/data/shared/repositories/strip-undefined`

Removes `undefined` keys before Firestore writes:

```ts
await ref.set(stripUndefined(doc));
```

### `UseCase<TInput, TOutput>` — `@/data/shared/use-cases/base.use-case`

Abstract base with auto-validation, OTel tracing, and @Indexable support.

### `@Indexable(options)` — `@/data/shared/use-cases/indexable.decorator`

Decorator for automatic RAG indexing on create/delete use cases.

---

## Complete Scaffold Checklist

When creating a new data domain, create these files in order:

1. **`src/data/{domain}/models/{entity}.model.ts`** — Document, DTO, mapper, Zod schemas
2. **`src/data/{domain}/repositories/{entity}.repository.ts`** — CRUD with `scopedCol` + `stripUndefined`
3. **`src/data/{domain}/service/{entity}.service.ts`** — (skip if simple CRUD)
4. **`src/data/{domain}/use-cases/create-{entity}.use-case.ts`** — with `@Indexable`
5. **`src/data/{domain}/use-cases/list-{entity}s.use-case.ts`**
6. **`src/data/{domain}/use-cases/delete-{entity}.use-case.ts`** — with `@Indexable({ remove: true })`
7. **`src/data/{domain}/index.ts`** — barrel exports
8. **`src/app/api/{resource}/route.ts`** — GET + POST
9. **`src/app/api/{resource}/[{id}]/route.ts`** — GET + DELETE
10. **`src/data/cached.ts`** — add `CacheTags.{entity}` + `getCached{Entity}s()`
11. **`src/data/actions.ts`** — add `revalidate{Entity}s()`
12. **`firestore.indexes.json`** — add composite indexes for `where` + `orderBy` combos

### Common Pitfalls

- Forgetting `stripUndefined()` before Firestore writes → runtime error
- Forgetting to thread `dependentId` through UseCase → Service → Repository → data belongs to wrong profile
- Missing composite index in `firestore.indexes.json` → 503 error at runtime
- Returning raw `Document` instead of `DTO` from repository → timestamps leak as Firestore objects
- Not adding `nameLower` field → case-insensitive search/duplicate detection doesn't work
- Calling `ragService` manually instead of using `@Indexable` → inconsistent indexing behavior
