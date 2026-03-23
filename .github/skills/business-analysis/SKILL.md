---
name: business-analysis
description: "**BUSINESS ANALYSIS SKILL** — BA role, methodology, analytics, usage tracking, KPI dashboards, clinical metrics, and reporting patterns for this Next.js 16 + React 19 + Firestore healthcare project. USE FOR: BA role & responsibilities; SDLC-phase mapping; requirements elicitation; Firebase Analytics (GA4) typed events; usage/credits tracking; KPI card patterns; dashboard pages (doctor + patient); clinical data analysis (SOAP notes, patient summaries, encounters, feedback); SSR prefetch → Hydrate for dashboards; loading skeletons; query key factories for metrics; AI orchestration & ethics governance. DO NOT USE FOR: Firestore CRUD patterns (use data-layer skill); Mantine styling basics (use frontend skill); AI/chat pipeline internals (use ai-sdk skill)."
---

# Business Analysis — Role, Methodology & Implementation Patterns

## The BA Role in CareAI

A Business Analyst is the **strategic bridge** between business objectives and technical execution — a translator who takes a vague business idea (e.g., "We need to reduce patient churn") and turns it into a technical blueprint (e.g., "Implement an automated engagement dashboard with session-frequency KPIs and churn-risk alerts").

### Core Roles

| Role                      | Description                                                                                           | CareAI Example                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **The Bridge (Liaison)**  | Primary contact between non-technical stakeholders and technical teams                                | Translating a doctor's request for "patient overview" into a KPI card spec with conditions, medications, risk level |
| **The Problem Solver**    | Identifying "As-Is" process inefficiencies and designing "To-Be" optimized workflows                  | Discovering that daily credit tracking was disconnected from monthly usage → unifying into `usage/{profile}`        |
| **The Data Storyteller**  | Moving beyond raw numbers to provide context — explaining _why_ trends matter and what action to take | Building the Usage dashboard cards that show not just numbers but color-coded urgency (green → orange → red)        |
| **The Strategic Advisor** | Ensuring every feature contributes to strategic goals, preventing scope creep                         | Validating that new KPI cards map to measurable patient outcomes, not vanity metrics                                |

### Key Responsibilities Across the SDLC

| SDLC Phase            | Responsibility                                                            | CareAI Implementation                                                                                                           |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Discovery**         | Workshops, interviews, root-cause analysis of business pain points        | Stakeholder interviews → identify which clinical metrics matter (SOAP risk levels, encounter frequency)                         |
| **Documentation**     | User Stories, Acceptance Criteria, BRDs, process maps (BPMN)              | Zod schemas as living specs (`CreateSoapNoteSchema`, `SubmitFeedbackSchema`), typed `AnalyticsEvent` union as event catalog     |
| **Agile Support**     | Backlog grooming, sprint planning, value-vs-effort prioritization         | Query key factories (`chatKeys.*`) organize data domains; UseCase pattern enforces single-responsibility per feature            |
| **Technical Support** | Clarifying complex logic for developers, ensuring architecture alignment  | Skill files like this one — translating business requirements into code patterns and conventions                                |
| **Validation**        | Leading UAT, ensuring the product solves the original problem             | Loading skeletons match content layout; optimistic mutations give instant feedback; `usageBarColor()` validates threshold logic |
| **Change Management** | Training users on new systems, managing the people side of transformation | Design system page (`/design-system`), usage dashboard as self-service analytics                                                |

### Modern BA Trends (2026)

| Trend                          | Application in CareAI                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Orchestration**           | Identifying which clinical workflows are best candidates for AI agents (clinical, diet-planner, prescription, lab-report) and defining their routing rules in the gateway agent |
| **Ethics & Governance**        | Ensuring AI-generated SOAP notes, patient summaries, and prescriptions comply with healthcare data privacy requirements; consent-gated access to patient health records         |
| **Low-Code/No-Code Mentoring** | The design system page (`/design-system`) and typed token exports (`@/ui/tokens`) enable non-frontend engineers to build consistent UIs                                         |

---

## Golden Rules

1. **Typed analytics events** — every client-side event must be added to the `AnalyticsEvent` union in `src/lib/analytics.ts`. Never call `logEvent` with raw strings.
2. **Usage is monthly** — the single source of truth is `usage/{profile}` in Firestore. Lazy-reset on read: if `lastReset` !== current month, reset to defaults. Never use the legacy daily `credits/{userId}` collection.
3. **KPI cards follow the ring pattern** — Header (icon + title + badge) → RingProgress → StatRow + Progress → Footer. Use `usageBarColor()` for consistent color coding.
4. **SSR prefetch → Hydrate** — dashboard pages prefetch queries server-side via `getQueryClient().prefetchQuery()`, then wrap client content in `<Hydrate client={queryClient}>`.
5. **Loading skeletons are mandatory** — every dashboard page has a `loading.tsx` with matching skeleton structure. Use `UsageCardSkeleton` for usage cards.
6. **Query keys from factories** — always use `chatKeys.*()` or domain-specific key factories. Never hardcode query key arrays.
7. **Optimistic deletes** — all delete mutations snapshot, optimistically remove from cache, and rollback on error.
8. **Every feature must map to a business outcome** — before building a new dashboard card or metric, identify what decision it enables and who the stakeholder is.
9. **Zod schemas are living documentation** — treat input schemas as the single source of truth for business rules, not separate BRD documents.
10. **Consent-gated data access** — all cross-user data views (doctor viewing patient records) must validate consent status before returning data.

---

## Architecture Overview

```
Firebase Analytics (GA4)          Usage / Credits System
  ↓                                 ↓
trackEvent() — client-side        UsageService (lazy-reset monthly)
  ↓                                 ↓
AnalyticsEvent union type         usage/{profile} Firestore doc
  ↓                                 ↓
AnalyticsProvider (root mount)    GetUsageUseCase → API route → client query
```

```
Dashboard Page (SSR)
  ↓
prefetchQuery (server)
  ↓
<Hydrate> wraps client content
  ↓
Client queries (useQuery) — hit TanStack cache (prefetched)
  ↓
KPI cards / stat cards / data tables
  ↓
loading.tsx (Skeleton fallback during Suspense)
```

---

## Key Files

| File                                                                 | Purpose                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/analytics.ts`                                               | Firebase GA4 singleton, `AnalyticsEvent` union, `trackEvent()`   |
| `src/ui/providers/analytics-provider.tsx`                            | Mounts GA4 on client — rendered once in root layout              |
| `src/data/usage/`                                                    | Usage domain: model, repository, service, use case               |
| `src/data/usage/models/usage.model.ts`                               | `Usage` type: profile, credits, minutes, storage, lastReset      |
| `src/data/usage/service/lazy-reset-usage.service.ts`                 | Monthly lazy-reset logic + defaults                              |
| `src/data/usage/use-cases/get-usage.use-case.ts`                     | Entry point for API routes                                       |
| `src/data/encounters/`                                               | Encounter tracking: doctor-patient call records                  |
| `src/data/feedback/`                                                 | User feedback (like/dislike/report) on AI messages               |
| `src/data/soap-notes/`                                               | Clinical SOAP notes — AI-generated per session                   |
| `src/data/patient-summary/`                                          | Comprehensive patient health summaries                           |
| `src/app/(portal)/patient/usage/`                                    | Patient usage dashboard (credits, storage, calls, profiles)      |
| `src/app/(portal)/patient/usage/_shared.tsx`                         | `usageBarColor()`, `StatRow`, `UsageCardSkeleton`, `formatBytes` |
| `src/app/(portal)/doctor/(portal)/dashboard/`                        | Doctor dashboard (patients queue, stat cards, presence)          |
| `src/app/(portal)/doctor/(portal)/patients/[patientId]/_content.tsx` | `KpiCard` component, patient snapshot with health risk KPIs      |

---

## 1. Firebase Analytics (GA4)

### Typed Event System

**File**: `src/lib/analytics.ts`

All events are typed via a discriminated union. This ensures compile-time safety — adding a new event requires updating the union:

```ts
export type AnalyticsEvent =
  // Auth
  | { name: "login"; params: { method: string } }
  | { name: "sign_up"; params?: { method?: string } }
  // Chat
  | { name: "chat_started"; params?: { session_id?: string } }
  | { name: "chat_message_sent"; params?: { session_id?: string } }
  // Clinical
  | { name: "assessment_completed"; params?: { assessment_id?: string } }
  | { name: "vital_recorded"; params?: { vital_type?: string } };
// ... etc
```

### Adding a New Event

1. Add the event shape to the `AnalyticsEvent` union in `src/lib/analytics.ts`
2. Call `trackEvent()` at the appropriate client-side handler:

```ts
import { trackEvent } from "@/lib/analytics";

trackEvent({ name: "my_new_event", params: { key: value } });
```

### Conventions

- **Event names**: `snake_case`, domain-prefixed (`chat_`, `assessment_`, `doctor_`, `file_`)
- **Params are optional objects**: use `params?: { ... }` for events where metadata is nice-to-have
- **SSR-safe**: `trackEvent()` silently drops events when called server-side or before GA4 init
- **Initialization**: handled by `<AnalyticsProvider>` in root layout — never call `initAnalytics()` manually

---

## 2. Usage & Credits System

### Data Model

**File**: `src/data/usage/models/usage.model.ts`

```ts
export type Usage = Readonly<{
  profile: string; // profile id or user id
  credits: number; // AI assessment credits (default: 100/month)
  minutes: number; // video call minutes (default: 1000/month)
  storage: number; // file storage in MB (default: 1024)
  lastReset: string; // ISO month "YYYY-MM" — triggers lazy reset
}>;
```

### Lazy Reset Service

**File**: `src/data/usage/service/lazy-reset-usage.service.ts`

Monthly reset happens transparently on read:

```ts
const USAGE_DEFAULTS = { credits: 100, minutes: 1000, storage: 1024 };

async getUsage(profile: string): Promise<Usage> {
  let usage = await this.repo.getUsage(profile);
  const currentMonth = this.getCurrentMonth(); // "YYYY-MM"
  if (!usage || usage.lastReset !== currentMonth) {
    usage = { profile, ...USAGE_DEFAULTS, lastReset: currentMonth };
    await this.repo.setUsage(profile, usage);
  }
  return usage;
}
```

### Credit Consumption

Credits are consumed by the **credit middleware** in the AI pipeline (`src/data/shared/service/middleware/credit.middleware.ts`). It calls `UsageService.updateUsage()` to decrement. The middleware sets a `__creditConsumed` flag to prevent double-charging in multi-step tool loops.

### Cache Invalidation

After AI messages consume credits, the chat API route busts the cache:

```ts
import { revalidateTag } from "next/cache";
revalidateTag(CacheTags.usage(userId));
```

Client-side invalidation after streaming:

```ts
const invalidateCredits = useInvalidateCredits();
// called in onFinish callback
invalidateCredits();
```

---

## 3. KPI Card Patterns

### Usage Card Pattern (Ring + Progress)

Every usage card follows this 4-section layout:

```
┌─────────────────────────────────┐
│ Header: Icon + Title + Badge    │ ← Card.Section withBorder
├─────────────────────────────────┤
│ RingProgress (centered)         │ ← Card.Section withBorder
├─────────────────────────────────┤
│ StatRow + Progress bar          │ ← Card.Section withBorder
├─────────────────────────────────┤
│ Footer: reset date / count      │ ← Card.Section bg dimmed
└─────────────────────────────────┘
```

### Template — Usage Card

```tsx
"use client";
import { useState } from "react";
import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  RingProgress,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconBolt, IconCalendarClock } from "@tabler/icons-react";
import {
  StatRow,
  usageBarColor,
  UsageCardError,
  UsageCardSkeleton,
} from "./_shared";

const MONTHLY_LIMIT = 100;

export function MyUsageCard() {
  const { data, isLoading, isError } = useMyMetricQuery();
  const [hovered, setHovered] = useState(false);

  if (isLoading) return <UsageCardSkeleton />;
  if (isError || !data)
    return <UsageCardError title="My Metric" subtitle="Description" />;

  const used = Math.min(data.used, MONTHLY_LIMIT);
  const remaining = Math.max(MONTHLY_LIMIT - used, 0);
  const usedPct =
    MONTHLY_LIMIT > 0 ? Math.min((used / MONTHLY_LIMIT) * 100, 100) : 0;
  const barColor = usageBarColor(usedPct);

  return (
    <Card
      radius="md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition:
          "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
        boxShadow: hovered
          ? "0 6px 24px light-dark(rgba(0,0,0,0.09), rgba(0,0,0,0.40))"
          : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
        borderColor: hovered ? "var(--mantine-color-primary-4)" : undefined,
      }}
    >
      {/* Header */}
      <Card.Section
        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
        px="md"
        py="sm"
        withBorder
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs">
            <ThemeIcon size={30} radius="md" color="primary" variant="light">
              <IconBolt size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={600} size="sm" lh={1.2}>
                My Metric
              </Text>
              <Text size="xs" c="dimmed">
                Resets monthly
              </Text>
            </Box>
          </Group>
          <Badge
            size="sm"
            color={remaining === 0 ? "red" : barColor}
            variant="light"
            radius="xl"
          >
            {remaining} left
          </Badge>
        </Group>
      </Card.Section>

      {/* Ring */}
      <Card.Section p="md" withBorder>
        <Box
          style={{
            borderRadius: 12,
            background: `light-dark(var(--mantine-color-${barColor}-0), rgba(99,102,241,0.07))`,
            display: "flex",
            justifyContent: "center",
            padding: "10px 0",
          }}
        >
          <RingProgress
            size={100}
            thickness={10}
            roundCaps
            sections={[{ value: usedPct, color: barColor }]}
            label={
              <Stack gap={2} align="center">
                <Text fw={800} size="lg" lh={1} c={barColor}>
                  {Math.round(100 - usedPct)}%
                </Text>
                <Text style={{ fontSize: 10 }} c="dimmed" lh={1}>
                  remaining
                </Text>
              </Stack>
            }
          />
        </Box>
      </Card.Section>

      {/* Stats + progress */}
      <Card.Section p="md" withBorder>
        <Stack gap={10}>
          <StatRow
            leftLabel="Used"
            leftValue={used}
            rightLabel="Limit"
            rightValue={MONTHLY_LIMIT}
          />
          <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
        </Stack>
      </Card.Section>

      {/* Footer */}
      <Card.Section
        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))"
        px="md"
        py="xs"
      >
        <Group gap={5}>
          <IconCalendarClock size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            Resets monthly
          </Text>
        </Group>
      </Card.Section>
    </Card>
  );
}
```

### Shared Helpers (`_shared.tsx`)

| Helper                   | Purpose                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `usageBarColor(usedPct)` | Returns `"primary"` (<60%), `"orange"` (60-89%), `"red"` (≥90%) |
| `StatRow`                | Left/right stat pair with divider — used in every usage card    |
| `UsageCardSkeleton`      | 4-section skeleton matching the ring card layout                |
| `UsageCardError`         | Error state card with alert icon                                |
| `formatBytes(bytes)`     | Human-readable byte formatting (B → KB → MB)                    |
| `formatResetDate(iso)`   | Localized date string for reset timestamps                      |
| `formatResetTime(iso)`   | Localized time string with timezone                             |

### Doctor KPI Card (Compact)

For doctor-facing dashboards, use the compact `KpiCard` pattern:

```tsx
function KpiCard({
  icon,
  label,
  value,
  color = "primary",
  description,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
  color?: string;
  description?: string;
}>) {
  return (
    <Box
      style={{
        ...iosCard,
        padding: 14,
        aspectRatio: "4 / 3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group gap={6} mb={8} wrap="nowrap">
        <Box
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: `light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: `var(--mantine-color-${color}-5)`,
          }}
        >
          {icon}
        </Box>
        <Text
          size="xs"
          c="dimmed"
          fw={500}
          style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
        >
          {label}
        </Text>
      </Group>
      <Text
        fw={800}
        size="xl"
        lh={1}
        style={{ flex: 1, display: "flex", alignItems: "flex-end" }}
      >
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {description ?? ""}
      </Text>
    </Box>
  );
}
```

Used in `SimpleGrid cols={{ base: 2, sm: 4 }}` for responsive 4-column KPI rows.

---

## 4. Dashboard Page Pattern

### SSR Prefetch + Suspense

Every dashboard page follows:

```tsx
// page.tsx — server component
import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { DashboardContent } from "./_content";
import DashboardLoading from "./loading";

async function DashboardData({ userId }: Readonly<{ userId: string }>) {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: chatKeys.credits(),
      queryFn: async () => {
        const { GetUsageUseCase } =
          await import("@/data/usage/use-cases/get-usage.use-case");
        return new GetUsageUseCase().execute({ profile: userId });
      },
    }),
    // Additional prefetches in parallel...
  ]);
  return (
    <Hydrate client={queryClient}>
      <DashboardContent />
    </Hydrate>
  );
}

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) return <DashboardContent />; // unauthenticated fallback
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardData userId={user.uid} />
    </Suspense>
  );
}
```

### Loading Skeleton (`loading.tsx`)

Match the content layout structure exactly:

```tsx
import { Box, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { UsageCardSkeleton } from "./_shared";

export default function DashboardLoading() {
  return (
    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
      {/* Header skeleton */}
      <Stack gap={4} mb="lg">
        <Skeleton height={20} width={120} />
        <Skeleton height={14} width={200} />
      </Stack>
      {/* Card grid skeleton */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <UsageCardSkeleton />
        <UsageCardSkeleton />
        <UsageCardSkeleton />
        <UsageCardSkeleton />
      </SimpleGrid>
    </Box>
  );
}
```

### Content Component (`_content.tsx`)

```tsx
"use client";
import {
  Box,
  Card,
  Group,
  ScrollArea,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

export function DashboardContent() {
  return (
    <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
      <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
        <Card radius="xl" withBorder>
          <Card.Section
            bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
            px="md"
            py="md"
            withBorder
          >
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" color="primary" variant="light">
                <IconGauge size={20} />
              </ThemeIcon>
              <Box>
                <Title order={4} lh={1.2}>
                  Dashboard
                </Title>
                <Text size="xs" c="dimmed">
                  Your metrics at a glance
                </Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {/* KPI cards here */}
            </SimpleGrid>
          </Card.Section>
        </Card>
      </Box>
    </ScrollArea>
  );
}
```

---

## 5. Clinical Data Analysis Domains

### SOAP Notes (`src/data/soap-notes/`)

AI-generated clinical summaries per chat session:

- **Model**: `SoapNoteDocument` — condition, riskLevel (low/moderate/high/emergency), subjective, objective, assessment, plan[]
- **Upsert by session**: `SoapNoteService.upsertBySession()` — ensures exactly one SOAP note per session
- **RAG-indexed**: `@Indexable` on `CreateSoapNoteUseCase` auto-indexes for vector search
- **Risk levels**: `"low" | "moderate" | "high" | "emergency"` — use semantic colors:
  - low → `success`, moderate → `warning`, high → `danger`, emergency → `red`

### Patient Summaries (`src/data/patient-summary/`)

Comprehensive health overviews generated by the clinical AI agent.

- **Firestore path**: `profiles/{profileId}/patient-summaries`
- **Model**: `PatientSummaryDocument`
  - `userId: string` — owning user
  - `sessionId?: string` — chat session that generated this summary
  - `title: string` — summary title
  - `narrative: string` — free-text clinical narrative
  - `chiefComplaints: string[]`
  - `diagnoses: Array<{ name: string; icd10?: string; status: string }>`
  - `medications: Array<{ name: string; dosage?: string; frequency?: string }>`
  - `vitals: Array<{ name: string; value: string; unit?: string }>`
  - `allergies: string[]`
  - `riskFactors: string[]`
  - `recommendations: string[]`
  - `createdAt: Timestamp`, `updatedAt: Timestamp`
- **Service**: `PatientSummaryService` — thin CRUD pass-through (UseCase → Service → Repository)
- **Use case entry points**: `CreatePatientSummaryUseCase`, `ListPatientSummariesUseCase`, `DeletePatientSummaryUseCase`
- **RAG indexing**: `@Indexable` on `CreatePatientSummaryUseCase` (type `"patient-summary"`, content fields `["title", "narrative"]`); `@Indexable({ remove: true })` on `DeletePatientSummaryUseCase`
- **Zod schemas**: `CreatePatientSummarySchema` (userId + all content fields), `ListPatientSummariesSchema` (userId, limit?), `DeletePatientSummarySchema` (userId, summaryId)
- **DTO**: `PatientSummaryDto` — same fields as Document but `createdAt`/`updatedAt` as ISO-8601 strings, plus `id`

### Encounters (`src/data/encounters/`)

Doctor-patient video call records:

- **Model**: `EncounterDocument` — patientId, doctorId, requestId, chimeMeetingId, status (active/completed), durationSeconds, notes
- **Repository queries**: `listByDoctor()`, `listByPatient()`, `listByDoctorAndPatient()` — all sorted by `startedAt desc`
- **Lifecycle**: Created on call accept → completed on call end (deferred via `after()`)
- **Notes**: Doctors can attach notes post-call via `UpdateEncounterNotesUseCase`

### Feedback (`src/data/feedback/`)

User feedback on AI messages:

- **Model**: `FeedbackDocument` — userId, email, messageId, sessionId, type (like/dislike/report), text
- **Validation**: Report type requires non-empty text (Zod `.refine()`)
- **Repository**: write-only (no list/read exposed yet — potential analytics query target)

---

## 6. Query Key Factories

### Patient-Side Keys (`src/app/(portal)/patient/_keys.ts` or `src/ui/ai/keys.ts`)

```ts
export const chatKeys = {
  credits: () => ["chat", "credits"] as const,
  storageMetrics: () => ["chat", "storage-metrics"] as const,
  callMetrics: () => ["chat", "call-metrics"] as const,
  dependents: () => ["chat", "dependents"] as const,
  sessions: (profileId?: string) => ["chat", "sessions", profileId] as const,
  conditions: () => ["chat", "conditions"] as const,
  soapNotes: () => ["chat", "soap-notes"] as const,
  assessments: () => ["chat", "assessments"] as const,
  patientSummaries: () => ["chat", "patient-summaries"] as const,
  // ... more in the actual file
} as const;
```

### Dependent-Scoped Queries

Most patient queries append `dependentId` to the key for multi-profile support:

```ts
export function useSoapNotesQuery() {
  const pid = useActiveDependentId(); // undefined for self, string for dependent
  return useQuery({
    queryKey: [...chatKeys.soapNotes(), pid],
    queryFn: () => apiFetch<SoapNoteRecord[]>("/api/soap-notes"),
    staleTime: 30_000,
  });
}
```

### Invalidation Patterns

```ts
// Hook-based invalidation (client-side, after mutations)
export function useInvalidateCredits() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: chatKeys.credits() });
}

// Server-side invalidation (API routes, after background writes)
import { revalidateTag } from "next/cache";
revalidateTag(CacheTags.usage(userId));
```

---

## 7. Optimistic Mutations for Analytics Data

### Delete with Rollback

Standard pattern for all deletable analytics records:

```ts
export function useDeleteSoapNoteMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.soapNotes(), pid] as const;

  return useMutation({
    mutationFn: (noteId: string) =>
      apiFetch<{ ok: boolean }>(`/api/soap-notes/${noteId}`, {
        method: "DELETE",
      }),
    onMutate: async (noteId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<SoapNoteRecord[]>(key);
      qc.setQueryData<SoapNoteRecord[]>(key, (old = []) =>
        old.filter((n) => n.id !== noteId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

---

## 8. Doctor Dashboard Specifics

### Doctor Dashboard Page Structure

```
src/app/(portal)/doctor/(portal)/dashboard/
├── page.tsx          — SSR prefetch (profile query)
├── loading.tsx       — Skeleton fallback
├── _content.tsx      — DashboardContent: greeting + stat cards + queue
├── _patients-queue.tsx  — Live patient queue (RTDB-backed)
├── _call-queue.tsx   — Incoming call cards with accept/reject
└── _presence-card.tsx   — Doctor online/busy/offline status
```

### IosStatCard Pattern

Doctor dashboard uses iOS-inspired stat cards:

```tsx
function IosStatCard({ label, value, subtitle, icon, delay }: Readonly<{...}>) {
    return (
        <Box p="lg" style={{ ...iosCard, animation: ios.animation.scaleIn(delay) }}>
            <Group justify="space-between" wrap="nowrap">
                <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 11 }}>
                        {label}
                    </Text>
                    <Text fw={700} style={{ fontSize: 28, lineHeight: 1 }}>{value}</Text>
                    <Text size="xs" c="dimmed">{subtitle}</Text>
                </Stack>
                <Box style={{ width: 48, height: 48, borderRadius: 14, background: "light-dark(rgba(99,102,241,0.08), rgba(99,102,241,0.12))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mantine-color-primary-5)" }}>
                    {icon}
                </Box>
            </Group>
        </Box>
    );
}
```

### Patient Health Records View

Doctor views patient health records via consent-gated API:

```
GET /api/doctor-patients/[patientId]/health-records
```

Returns parallel-fetched: conditions, soapNotes, medications, assessments, labReports, profile, patient data — all validated against accepted consent status.

---

## 9. Conventions Summary

| Pattern             | Convention                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| New analytics event | Add to `AnalyticsEvent` union → call `trackEvent()`                          |
| New usage metric    | Add field to `Usage` type → update defaults → update card                    |
| New KPI card        | Use ring pattern from `_shared.tsx` helpers                                  |
| New dashboard page  | SSR prefetch → Hydrate → \_content.tsx → loading.tsx                         |
| New clinical metric | Follow data-layer domain pattern (model → repo → service → use case)         |
| Delete mutation     | Optimistic remove + snapshot rollback                                        |
| Query keys          | Use factory from `chatKeys` — append `dependentId` for multi-profile         |
| Color coding        | `usageBarColor()` for usage, semantic `colors.*` from tokens for risk levels |
| Loading states      | `UsageCardSkeleton` for usage cards, `Skeleton` from Mantine for others      |
| Multi-profile       | Thread `dependentId` through use case → service → repository                 |
