"use client";
/**
 * TanStack Query hooks for CareAI session & message management.
 *
 * All data is fetched from the REST API. The AI SDK's `useChat` handles
 * the streaming connection to /api/chat — it is intentionally kept outside
 * TanStack Query since it is a persistent streaming transport.
 */

import { useSyncExternalStore } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { chatKeys } from "@/app/(portal)/patient/_keys";
export { chatKeys } from "@/app/(portal)/patient/_keys";
import {
  revalidateUsage,
  revalidateProfile,
  revalidateFiles,
  revalidateVitals,
} from "@/data/actions";
import type { ExtractResult } from "@/data/prescriptions/models/extract.model";
import { trackEvent } from "@/lib/analytics";
export type {
  ExtractedMedication,
  ExtractResult,
} from "@/data/prescriptions/models/extract.model";

// ── Client-side DTOs (plain objects — no Firebase deps) ──────────────────────

export interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  lastAgentType?: string;
  totalUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSessionsResponse {
  sessions: SessionSummary[];
  nextCursor: string | null;
  totalCount?: number;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface UsageDto {
  credits: number;
  minutes: number;
  storage: number;
  lastReset: string; // ISO YYYY-MM
}

export type FileLabel =
  | "xray"
  | "blood_test"
  | "prescription"
  | "scan"
  | "report"
  | "vaccination"
  | "other";

export interface FileRecord {
  id: string;
  sessionId: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  downloadUrl: string | null;
  createdAt: string;
  /** AI-extracted prescription data, populated after user triggers extraction. */
  extractedData?: ExtractResult;
  /** AI-assigned classification label (set asynchronously after upload). */
  label?: FileLabel;
  /** Confidence score 0–1 for the assigned label. */
  labelConfidence?: number;
  /** Proxy URL to a generated WebP thumbnail (images only). */
  thumbnailUrl?: string | null;
}

export interface PaginatedFilesResponse {
  files: FileRecord[];
  nextCursor: string | null;
  totalCount?: number;
}

export type MedicationForm =
  | "Tablet"
  | "Capsule"
  | "Oral Solution"
  | "Suspension"
  | "Injection"
  | "Topical"
  | "Patch"
  | "Inhaler"
  | "Eye Drops"
  | "Syrup"
  | "Other";

export interface PrescriptionMedicationRecord {
  name: string;
  dosage: string;
  form: MedicationForm;
  frequency: string;
  duration: string;
  instructions?: string;
  indication: string;
  monitoring?: string;
}

export interface PrescriptionRecord {
  id: string;
  userId: string;
  fileId?: string;
  fileUrl?: string;
  fileMimeType?: string;
  sessionId?: string;
  source: "extracted" | "generated";
  medications: PrescriptionMedicationRecord[];
  generalInstructions?: string;
  followUp?: string;
  urgent?: boolean;
  prescribedBy?: string;
  prescriptionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StorageMetricsRecord {
  /** Total bytes used across all uploaded files. */
  usedBytes: number;
  /** Total number of files. */
  fileCount: number;
  /** Per-user storage allocation in bytes (100 MB). */
  limitBytes: number;
}

export interface CallMetricsRecord {
  /** Number of calls initiated this calendar month. */
  used: number;
  /** Maximum calls allowed per month. */
  limit: number;
  /** ISO-8601 timestamp when the monthly counter resets (first of next month UTC). */
  resetsAt: string;
}

export type MedicationStatus =
  | "active"
  | "completed"
  | "discontinued"
  | "paused";

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface MedicationRecord {
  id: string;
  userId: string;
  sessionId?: string;
  prescriptionId?: string;
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  condition?: string;
  status: MedicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DietFood {
  item: string;
  portion: string;
  calories: number;
  weight?: number;
  nutrition?: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  allergens?: string[];
  dietaryType?: "veg" | "non-veg" | "vegan";
}

export interface DietMeal {
  name: string;
  time: string;
  foods: DietFood[];
  totalCalories: number;
}

export interface DietDay {
  day: string;
  meals: DietMeal[];
  totalCalories: number;
}

export interface DietPlanRecord {
  id: string;
  userId: string;
  sessionId?: string;
  condition: string;
  overview: string;
  weeklyWeightLossEstimate?: string;
  totalDailyCalories?: number;
  weeklyPlan?: DietDay[];
  recommended: { food: string; reason: string }[];
  avoid: { food: string; reason: string }[];
  tips: string[];
  createdAt: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────
// chatKeys is imported from _keys.ts (shared with server components)

// ── Active profile state (module-level — shared across all hooks) ─────────────

/** The currently active dependent ID. `undefined` = the user's own profile ("self"). */
let _activeDependentId: string | undefined;
const _profileListeners = new Set<() => void>();

/** Called by ActiveProfileContext when the user switches profiles. */
export function setActiveDependentId(id: string | undefined) {
  _activeDependentId = id;
  _profileListeners.forEach((fn) => fn());
}

/** Reactive hook — causes query keys to update when the active profile changes. */
function useActiveDependentId() {
  return useSyncExternalStore(
    (fn) => {
      _profileListeners.add(fn);
      return () => {
        _profileListeners.delete(fn);
      };
    },
    () => _activeDependentId,
    () => undefined,
  );
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (_activeDependentId) headers.set("x-dependent-id", _activeDependentId);
  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Reactive list of sessions for the authenticated user, sorted newest-first. */
export function useSessionsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.sessions(), pid],
    queryFn: () => apiFetch<SessionSummary[]>("/api/sessions"),
    staleTime: 30_000,
  });
}

/** Paginated sessions for the history page with lazy loading. */
export function useInfiniteSessionsQuery() {
  const pid = useActiveDependentId();
  return useInfiniteQuery({
    queryKey: [...chatKeys.sessions(), "paginated", pid],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<PaginatedSessionsResponse>(
        `/api/sessions?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

/** Current monthly credit balance for the authenticated user. */
export function useCreditsQuery() {
  return useQuery({
    queryKey: chatKeys.credits(),
    queryFn: () => apiFetch<UsageDto>("/api/credits"),
    placeholderData: keepPreviousData,
  });
}

/** Optimistically deduct one credit immediately, then refetch to sync with server. */
export function useOptimisticDeductCredit() {
  const qc = useQueryClient();
  return () => {
    qc.setQueryData<UsageDto>(chatKeys.credits(), (prev) =>
      prev ? { ...prev, credits: Math.max(0, prev.credits - 1) } : prev,
    );
    qc.invalidateQueries({ queryKey: chatKeys.credits() });
    revalidateUsage();
  };
}

/** Invalidate the credits cache — call after each message is sent. */
export function useInvalidateCredits() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: chatKeys.credits() });
    revalidateUsage();
  };
}

/** Invalidate the messages cache — call after a message finishes streaming to refetch with usage data. */
export function useInvalidateMessages(sessionId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
}

/**
 * Fetch all messages for a given session, ordered oldest-first.
 * Used to hydrate `useChat` with persisted history on page load.
 */
export function useMessagesQuery(sessionId: string) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId),
    queryFn: () =>
      apiFetch<MessageRecord[]>(`/api/sessions/${sessionId}/messages`),
    staleTime: Infinity, // useChat owns live state after hydration
    enabled: !!sessionId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Delete a session (cascade-deletes messages + files on the server). */
export function useDeleteSessionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const infiniteKey = [...chatKeys.sessions(), "paginated", pid] as const;
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: infiniteKey });
      const snapshot = qc.getQueryData(infiniteKey);
      qc.setQueryData<{
        pages: PaginatedSessionsResponse[];
        pageParams: unknown[];
      }>(infiniteKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            sessions: page.sessions.filter((s) => s.id !== id),
          })),
        };
      });
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(infiniteKey, ctx.snapshot);
    },
    onSettled: (_result, _err, id) => {
      qc.invalidateQueries({ queryKey: chatKeys.sessions() });
      qc.removeQueries({ queryKey: chatKeys.messages(id) });
    },
  });
}

/**
 * Persist a new session in Firestore immediately when it is created client-side.
 * Pass the client-generated UUID as `id` so the server uses it as the doc ID,
 * avoiding a mismatch between the URL param and the Firestore document.
 */
export function useCreateSessionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const sessKey = [...chatKeys.sessions(), pid] as const;
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title?: string }) =>
      apiFetch<SessionSummary>("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: title ?? "New Session" }),
      }),
    onSuccess: (newSession) => {
      // Optimistically prepend to the cached list so the sidebar updates instantly.
      qc.setQueryData<SessionSummary[]>(sessKey, (old = []) => [
        newSession,
        ...old,
      ]);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sessKey });
    },
  });
}

/**
 * Returns a function that invalidates the sessions list — call after a new
 * message is sent so the sidebar title refreshes without a page reload.
 */
export function useInvalidateSessions() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    qc.invalidateQueries({ queryKey: [...chatKeys.sessions(), pid] });
}

/** Upload a single file — persists metadata to Firestore and returns the FileDto. */
export function useUploadFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      file,
      dependentId,
    }: {
      sessionId?: string;
      file: File;
      /** Pass activeDependentId from useActiveProfile() at the call site. */
      dependentId?: string;
    }): Promise<FileRecord> => {
      const formData = new FormData();
      formData.append("file", file);
      if (sessionId) formData.append("sessionId", sessionId);
      const headers: HeadersInit = {};
      if (dependentId) headers["x-dependent-id"] = dependentId;
      const res = await fetch("/api/files", {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
      }
      return res.json() as Promise<FileRecord>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: chatKeys.files() });
      qc.invalidateQueries({ queryKey: chatKeys.storageMetrics() });
      revalidateFiles();
      // Re-invalidate after a short delay to pick up the background AI classification label.
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: chatKeys.files() });
        revalidateFiles();
      }, 5_000);
      trackEvent({
        name: "file_uploaded",
        params: { file_type: data.mimeType },
      });
    },
    onError: (err) => {
      notifications.show({
        title: "Upload failed",
        message:
          err instanceof Error
            ? err.message
            : "Could not upload file. Please try again.",
        color: "red",
      });
    },
  });
}

/** Paginated file listing with optional filters. */
export function useFilesQuery(filters?: {
  label?: FileLabel;
  mimeType?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.label) params.set("label", filters.label);
  if (filters?.mimeType) params.set("mimeType", filters.mimeType);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();

  return useInfiniteQuery({
    queryKey: [...chatKeys.files(), qs],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams(params);
      if (pageParam) p.set("cursor", pageParam);
      return apiFetch<PaginatedFilesResponse>(`/api/files?${p.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

/** Delete a single uploaded file — optimistically removes it from all pages. */
export function useDeleteFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId }: { fileId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/files/${fileId}`, {
        method: "DELETE",
      }),
    onMutate: async ({ fileId }) => {
      await qc.cancelQueries({ queryKey: chatKeys.files() });
      const snapshot = qc.getQueriesData<{
        pages: PaginatedFilesResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: chatKeys.files() });
      qc.setQueriesData<{
        pages: PaginatedFilesResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: chatKeys.files() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            files: page.files.filter((f) => f.id !== fileId),
          })),
        };
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.files() });
      qc.invalidateQueries({ queryKey: chatKeys.storageMetrics() });
      revalidateFiles();
    },
  });
}

/** Fetch authenticated user's storage usage metrics (used/limit/count). */
export function useStorageMetricsQuery() {
  return useQuery({
    queryKey: chatKeys.storageMetrics(),
    queryFn: () => apiFetch<StorageMetricsRecord>("/api/files/storage"),
    staleTime: 30_000,
  });
}

/** Fetch authenticated patient's monthly call usage (used/limit/resetsAt). */
export function useCallMetricsQuery() {
  return useQuery({
    queryKey: chatKeys.callMetrics(),
    queryFn: () => apiFetch<CallMetricsRecord>("/api/meet/metrics"),
    staleTime: 60_000,
  });
}

// ── Person extraction ─────────────────────────────────────────────────────────

/**
 * Result of extracting person details from a document/image.
 * Returned by POST /api/files/extract-person.
 */
export interface ExtractedPersonResult {
  hasPersonData: boolean;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
}

/**
 * Calls the person-extraction endpoint on a file (image / PDF).
 * Does NOT consume a user credit — this is a background system check.
 * On any failure it resolves to `{ hasPersonData: false }` so the send proceeds.
 */
export function useExtractPersonFromFileMutation() {
  return useMutation({
    mutationFn: async (file: File): Promise<ExtractedPersonResult> => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files/extract-person", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return { hasPersonData: false };
      return res.json() as Promise<ExtractedPersonResult>;
    },
  });
}

// ── Prescriptions ─────────────────────────────────────────────────────────────

/** Fetch all prescription records for the authenticated user (or active dependent). */
export function usePrescriptionsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.prescriptions(), pid],
    queryFn: () => apiFetch<PrescriptionRecord[]>("/api/prescriptions"),
    staleTime: 30_000,
  });
}

/** Select a single prescription from the list cache by ID. */
export function usePrescriptionQuery(prescriptionId: string) {
  const { data: prescriptions = [], isLoading } = usePrescriptionsQuery();
  const record = prescriptions.find((p) => p.id === prescriptionId) ?? null;
  return { data: record, isLoading };
}

/** Upload a prescription image, then auto-extract medications. */
export function useUploadPrescriptionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: async ({
      file,
      sessionId,
    }: {
      file: File;
      sessionId?: string;
    }): Promise<PrescriptionRecord> => {
      const tag = sessionId ?? "prescriptions";
      const headers: HeadersInit = pid ? { "x-dependent-id": pid } : {};

      // Step 1 — upload file via the generic files API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", tag);
      const uploadRes = await fetch("/api/files", {
        method: "POST",
        body: formData,
        headers,
      });
      if (!uploadRes.ok) {
        const body = (await uploadRes.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          body.error?.message ?? `Upload failed (${uploadRes.status})`,
        );
      }
      const uploaded = (await uploadRes.json()) as FileRecord;

      // Step 2 — extract prescription data from the uploaded file
      const extractRes = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ fileId: uploaded.id }),
      });
      if (!extractRes.ok) {
        const body = (await extractRes.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          body.error?.message ?? `Extraction failed (${extractRes.status})`,
        );
      }
      return extractRes.json() as Promise<PrescriptionRecord>;
    },
    onSuccess: (prescription) => {
      qc.setQueryData<PrescriptionRecord[]>(
        [...chatKeys.prescriptions(), pid],
        (old = []) => [prescription, ...old],
      );
      qc.invalidateQueries({
        queryKey: [...chatKeys.prescriptions(), pid],
      });
    },
  });
}

/** Delete a prescription — optimistically removes it from the cache. */
export function useDeletePrescriptionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const prescKey = [...chatKeys.prescriptions(), pid] as const;
  return useMutation({
    mutationFn: ({ prescriptionId }: { prescriptionId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/prescriptions/${prescriptionId}`, {
        method: "DELETE",
      }),
    onMutate: async ({ prescriptionId }) => {
      await qc.cancelQueries({ queryKey: prescKey });
      const snapshot = qc.getQueryData<PrescriptionRecord[]>(prescKey);
      qc.setQueryData<PrescriptionRecord[]>(prescKey, (old = []) =>
        old.filter((p) => p.id !== prescriptionId),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(prescKey, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: prescKey });
    },
  });
}

/** Re-extract medication details from a prescription image using AI. */
export function useExtractPrescriptionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: ({ fileId }: { fileId: string }) =>
      apiFetch<PrescriptionRecord>(`/api/prescriptions/${fileId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: (prescription) => {
      // Upsert the prescription into the cache.
      qc.setQueryData<PrescriptionRecord[]>(
        [...chatKeys.prescriptions(), pid],
        (old = []) => {
          const idx = old.findIndex((p) => p.id === prescription.id);
          if (idx >= 0) {
            const next = [...old];
            next[idx] = prescription;
            return next;
          }
          return [prescription, ...old];
        },
      );
    },
  });
}

/** Link a chat session to a prescription for AI follow-up. */
export function useLinkPrescriptionSessionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const prescKey = [...chatKeys.prescriptions(), pid] as const;
  return useMutation({
    mutationFn: ({
      prescriptionId,
      sessionId,
    }: {
      prescriptionId: string;
      sessionId: string;
    }) =>
      apiFetch<PrescriptionRecord>(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }),
    onMutate: async ({ prescriptionId, sessionId }) => {
      await qc.cancelQueries({ queryKey: prescKey });
      const snapshot = qc.getQueryData<PrescriptionRecord[]>(prescKey);
      qc.setQueryData<PrescriptionRecord[]>(prescKey, (old = []) =>
        old.map((p) => (p.id === prescriptionId ? { ...p, sessionId } : p)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(prescKey, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: prescKey });
    },
  });
}

// ── Medications ───────────────────────────────────────────────────────────────

export function useMedicationsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.medications(), pid],
    queryFn: () => apiFetch<MedicationRecord[]>("/api/medications"),
    staleTime: 30_000,
  });
}

export interface AddMedicationPayload {
  sessionId?: string;
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  condition?: string;
  status?: MedicationStatus;
}

/** Add a new medication to the user's list. */
export function useAddMedicationMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.medications(), pid] as const;
  return useMutation({
    mutationFn: (payload: AddMedicationPayload) =>
      apiFetch<MedicationRecord>("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<MedicationRecord[]>(key);
      const now = new Date().toISOString();
      const optimistic: MedicationRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        sessionId: undefined,
        name: payload.name,
        dosage: payload.dosage,
        form: payload.form,
        frequency: payload.frequency,
        duration: payload.duration,
        instructions: payload.instructions,
        condition: payload.condition,
        status: payload.status ?? "active",
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<MedicationRecord[]>(key, (old = []) => [
        optimistic,
        ...old,
      ]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<MedicationRecord[]>(key, (old = []) =>
        old.map((m) => (m.id.startsWith("__optimistic__") ? newRecord : m)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

export interface UpdateMedicationPayload {
  medicationId: string;
  name?: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  condition?: string;
  status?: MedicationStatus;
}

/** Update an existing medication. */
export function useUpdateMedicationMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.medications(), pid] as const;
  return useMutation({
    mutationFn: ({ medicationId, ...rest }: UpdateMedicationPayload) =>
      apiFetch<MedicationRecord>(`/api/medications/${medicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      }),
    onMutate: async ({ medicationId, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<MedicationRecord[]>(key);
      qc.setQueryData<MedicationRecord[]>(key, (old = []) =>
        old.map((m) => (m.id === medicationId ? { ...m, ...updates } : m)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete a medication — optimistically removes it from the list cache. */
export function useDeleteMedicationMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.medications(), pid] as const;
  return useMutation({
    mutationFn: (medicationId: string) =>
      apiFetch<{ ok: boolean }>(`/api/medications/${medicationId}`, {
        method: "DELETE",
      }),
    onMutate: async (medicationId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<MedicationRecord[]>(key);
      qc.setQueryData<MedicationRecord[]>(key, (old = []) =>
        old.filter((m) => m.id !== medicationId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

// ── Diet Plans ────────────────────────────────────────────────────────────────

/** Fetch all saved diet plans for the authenticated user. */
export function useDietPlansQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.dietPlans(), pid],
    queryFn: () => apiFetch<DietPlanRecord[]>("/api/diet-plans"),
    staleTime: 30_000,
  });
}

/** Invalidate the diet plans cache. */
export function useInvalidateDietPlans() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    qc.invalidateQueries({ queryKey: [...chatKeys.dietPlans(), pid] });
}

export interface AddDietPlanPayload {
  sessionId?: string;
  condition: string;
  overview: string;
  weeklyWeightLossEstimate?: string;
  totalDailyCalories?: number;
  weeklyPlan?: DietDay[];
  recommended: { food: string; reason: string }[];
  avoid: { food: string; reason: string }[];
  tips: string[];
}

/** Save a diet plan generated by the AI. */
export function useAddDietPlanMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.dietPlans(), pid] as const;
  return useMutation({
    mutationFn: (payload: AddDietPlanPayload) =>
      apiFetch<DietPlanRecord>("/api/diet-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DietPlanRecord[]>(key);
      const optimistic: DietPlanRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        sessionId: payload.sessionId,
        condition: payload.condition,
        overview: payload.overview,
        weeklyWeightLossEstimate: payload.weeklyWeightLossEstimate,
        totalDailyCalories: payload.totalDailyCalories,
        weeklyPlan: payload.weeklyPlan,
        recommended: payload.recommended,
        avoid: payload.avoid,
        tips: payload.tips,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<DietPlanRecord[]>(key, (old = []) => [
        optimistic,
        ...old,
      ]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<DietPlanRecord[]>(key, (old = []) =>
        old.map((p) => (p.id.startsWith("__optimistic__") ? newRecord : p)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete a diet plan — optimistically removes it from the list cache. */
export function useDeleteDietPlanMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.dietPlans(), pid] as const;
  return useMutation({
    mutationFn: (planId: string) =>
      apiFetch<{ ok: boolean }>(`/api/diet-plans/${planId}`, {
        method: "DELETE",
      }),
    onMutate: async (planId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DietPlanRecord[]>(key);
      qc.setQueryData<DietPlanRecord[]>(key, (old = []) =>
        old.filter((p) => p.id !== planId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

// ── Doctors ───────────────────────────────────────────────────────────────────

export interface ClinicInfo {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  placeId?: string;
}

export interface DoctorRecord {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  address: string;
  clinic?: ClinicInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicLookupResult {
  clinicName: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  placeId?: string;
}

export interface AddDoctorPayload {
  name: string;
  specialty: string;
  address: string;
  clinic?: ClinicInfo;
  notes?: string;
}

/** Fetch all doctors for the authenticated user. */
export function useDoctorsQuery() {
  return useQuery({
    queryKey: chatKeys.doctors(),
    queryFn: () => apiFetch<DoctorRecord[]>("/api/doctors"),
    staleTime: 30_000,
  });
}

/** Add a new doctor. */
export function useAddDoctorMutation() {
  const qc = useQueryClient();
  const key = chatKeys.doctors();
  return useMutation({
    mutationFn: (payload: AddDoctorPayload) =>
      apiFetch<DoctorRecord>("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DoctorRecord[]>(key);
      const now = new Date().toISOString();
      const optimistic: DoctorRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        name: payload.name,
        specialty: payload.specialty,
        address: payload.address,
        clinic: payload.clinic,
        notes: payload.notes,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<DoctorRecord[]>(key, (old = []) => [optimistic, ...old]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<DoctorRecord[]>(key, (old = []) =>
        old.map((d) => (d.id.startsWith("__optimistic__") ? newRecord : d)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete a doctor — optimistically removes it from the list cache. */
export function useDeleteDoctorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doctorId: string) =>
      apiFetch<{ ok: boolean }>(`/api/doctors/${doctorId}`, {
        method: "DELETE",
      }),
    onMutate: async (doctorId) => {
      await qc.cancelQueries({ queryKey: chatKeys.doctors() });
      const snapshot = qc.getQueryData<DoctorRecord[]>(chatKeys.doctors());
      qc.setQueryData<DoctorRecord[]>(chatKeys.doctors(), (old = []) =>
        old.filter((d) => d.id !== doctorId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(chatKeys.doctors(), ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.doctors() });
    },
  });
}

/** Look up clinic details for a doctor using AI + Google Search grounding. */
export function useClinicLookupMutation() {
  return useMutation({
    mutationFn: (payload: {
      name: string;
      specialty: string;
      address: string;
    }) =>
      apiFetch<ClinicLookupResult>("/api/doctors/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  });
}

// ── Assessments ───────────────────────────────────────────────────────────────

export interface QaPair {
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  sessionId: string;
  runId?: string;
  title: string;
  condition?: string;
  guideline?: string;
  estimatedQuestions?: number;
  estimatedMinutes?: string;
  status?: "active" | "completed" | "abandoned";
  startedAt?: string;
  completedAt?: string;
  riskLevel?: "low" | "moderate" | "high" | "emergency";
  summary?: string;
  qa: QaPair[];
  createdAt: string;
  updatedAt?: string;
}

/** Fetch all AI assessments for the authenticated user, newest-first. */
export function useAssessmentsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.assessments(), pid],
    queryFn: () => apiFetch<AssessmentRecord[]>("/api/assessments"),
    staleTime: 30_000,
  });
}

/** Fetch a single assessment by ID. */
export function useAssessmentQuery(assessmentId: string) {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.assessment(assessmentId), pid],
    queryFn: () =>
      apiFetch<AssessmentRecord>(`/api/assessments/${assessmentId}`),
    staleTime: Infinity,
    enabled: !!assessmentId,
  });
}

/** Invalidate the assessments cache — call after a message finishes streaming. */
export function useInvalidateAssessments() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    qc.invalidateQueries({ queryKey: [...chatKeys.assessments(), pid] });
}

/** Delete an assessment — optimistically removes it from the list cache. */
export function useDeleteAssessmentMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.assessments(), pid] as const;
  return useMutation({
    mutationFn: (assessmentId: string) =>
      apiFetch<{ ok: boolean }>(`/api/assessments/${assessmentId}`, {
        method: "DELETE",
      }),
    onMutate: async (assessmentId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<AssessmentRecord[]>(key);
      qc.setQueryData<AssessmentRecord[]>(key, (old = []) =>
        old.filter((a) => a.id !== assessmentId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ProfileRecord {
  userId: string;
  name?: string;
  photoUrl?: string;
  /** Self-identified gender */
  gender?: string;
  dateOfBirth?: string;
  sex?: Sex;
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  country?: string;
  city?: string;
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences?: string[];
  /** ISO-8601 timestamp of when the user accepted the consent terms. */
  consentedAt?: string;
  updatedAt?: string;
}

export interface UpsertProfilePayload {
  dateOfBirth?: string;
  sex?: Sex;
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  country?: string;
  city?: string;
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences?: string[];
  consentedAt?: string;
}

export function useProfileQuery() {
  return useQuery({
    queryKey: chatKeys.profile(),
    queryFn: () => apiFetch<ProfileRecord>("/api/profile"),
    staleTime: 60_000,
  });
}

// ── Patient health details ────────────────────────────────────────────────────

export interface PatientRecord {
  userId: string;
  dateOfBirth?: string;
  sex?: Sex;
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  foodPreferences?: string[];
  bloodGroup?: string;
  consentedAt?: string;
  updatedAt?: string;
}

export function usePatientQuery() {
  return useQuery({
    queryKey: chatKeys.patientDetails(),
    queryFn: () => apiFetch<PatientRecord>("/api/patients/me"),
    staleTime: 60_000,
  });
}

export function useUpsertProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertProfilePayload) =>
      apiFetch<ProfileRecord>("/api/patients/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.profile() });
      revalidateProfile();
    },
  });
}

/** Saves the current timestamp as consentedAt on the user's profile (write-once). */
export function useConsentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<PatientRecord>("/api/patients/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentedAt: new Date().toISOString() }),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(chatKeys.patientDetails(), updated);
      qc.invalidateQueries({ queryKey: chatKeys.profile() });
      revalidateProfile();
    },
  });
}

/** Updates base identity fields (name, phone, email) in profiles/{uid}. */
export function useUpdateIdentityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      phone?: string;
      email?: string;
      gender?: string;
      city?: string;
      country?: string;
    }) =>
      apiFetch<ProfileRecord>("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(
        chatKeys.profile(),
        (prev: ProfileRecord | undefined) => ({
          ...prev,
          ...updated,
        }),
      );
    },
  });
}

// ── Dependents ────────────────────────────────────────────────────────────────

export type Relationship =
  | "Spouse / Partner"
  | "Child"
  | "Parent"
  | "Sibling"
  | "Grandparent"
  | "Grandchild"
  | "Other";

export interface DependentRecord {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dateOfBirth?: string;
  sex?: Sex;
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  country?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDependentPayload {
  firstName: string;
  lastName?: string;
  relationship: Relationship;
  dateOfBirth?: string;
  sex?: Sex;
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  country?: string;
  city?: string;
}

export interface UpdateDependentPayload extends Partial<CreateDependentPayload> {
  dependentId: string;
}

export function useDependentsQuery() {
  return useQuery({
    queryKey: chatKeys.dependents(),
    queryFn: () => apiFetch<DependentRecord[]>("/api/dependents"),
    staleTime: 60_000,
  });
}

export function useCreateDependentMutation() {
  const qc = useQueryClient();
  const key = chatKeys.dependents();
  return useMutation({
    mutationFn: (data: CreateDependentPayload) =>
      apiFetch<DependentRecord>("/api/dependents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DependentRecord[]>(key);
      const now = new Date().toISOString();
      const optimistic: DependentRecord = {
        id: `__optimistic__${Date.now()}`,
        ownerId: "",
        firstName: data.firstName,
        lastName: data.lastName ?? "",
        relationship: data.relationship,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex,
        height: data.height,
        weight: data.weight,
        waistCm: data.waistCm,
        neckCm: data.neckCm,
        hipCm: data.hipCm,
        activityLevel: data.activityLevel,
        country: data.country,
        city: data.city,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<DependentRecord[]>(key, (old = []) => [
        ...old,
        optimistic,
      ]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<DependentRecord[]>(key, (old = []) =>
        old.map((d) => (d.id.startsWith("__optimistic__") ? newRecord : d)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateDependentMutation() {
  const qc = useQueryClient();
  const key = chatKeys.dependents();
  return useMutation({
    mutationFn: ({ dependentId, ...data }: UpdateDependentPayload) =>
      apiFetch<DependentRecord>(`/api/dependents/${dependentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onMutate: async ({ dependentId, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DependentRecord[]>(key);
      qc.setQueryData<DependentRecord[]>(key, (old = []) =>
        old.map((d) => (d.id === dependentId ? { ...d, ...updates } : d)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

export function useDeleteDependentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependentId: string) =>
      apiFetch<{ ok: boolean }>(`/api/dependents/${dependentId}`, {
        method: "DELETE",
      }),
    onMutate: async (dependentId) => {
      await qc.cancelQueries({ queryKey: chatKeys.dependents() });
      const snapshot = qc.getQueryData<DependentRecord[]>(
        chatKeys.dependents(),
      );
      qc.setQueryData<DependentRecord[]>(chatKeys.dependents(), (old = []) =>
        old.filter((d) => d.id !== dependentId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(chatKeys.dependents(), ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.dependents() });
    },
  });
}

// ── Lab Reports ───────────────────────────────────────────────────────────────

export type BiomarkerStatus = "normal" | "low" | "high" | "critical";

export interface BiomarkerRecord {
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: BiomarkerStatus;
}

export interface LabReportRecord {
  id: string;
  userId: string;
  fileId: string;
  fileUrl?: string;
  fileMimeType?: string;
  sessionId?: string;
  testName: string;
  labName?: string;
  labAddress?: string;
  orderedBy?: string;
  testDate?: string;
  notes?: string;
  biomarkers: BiomarkerRecord[];
  createdAt: string;
  updatedAt?: string;
}

/** Fetch all lab report records for the authenticated user (or active dependent). */
export function useLabReportsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.labReports(), pid],
    queryFn: () => apiFetch<LabReportRecord[]>("/api/lab-reports"),
    staleTime: 30_000,
  });
}

/** Fetch a single lab report record by ID. */
export function useLabReportQuery(recordId: string) {
  return useQuery({
    queryKey: [...chatKeys.labReports(), "detail", recordId],
    queryFn: () => apiFetch<LabReportRecord>(`/api/lab-reports/${recordId}`),
    staleTime: 30_000,
  });
}

/**
 * Upload a lab report file (image / PDF / doc) and auto-extract structured
 * data via AI. Returns the created LabReportRecord on success.
 */
export function useUploadLabReportMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: async (file: File): Promise<LabReportRecord> => {
      const formData = new FormData();
      formData.append("file", file);
      const headers = new Headers();
      if (pid) headers.set("x-dependent-id", pid);
      const res = await fetch("/api/lab-reports", {
        method: "POST",
        body: formData,
        headers,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
      }
      return res.json() as Promise<LabReportRecord>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...chatKeys.labReports(), pid] });
    },
  });
}

/** Delete a lab report record (and its underlying file). Optimistic update. */
export function useDeleteLabReportMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const lrKey = [...chatKeys.labReports(), pid] as const;
  return useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<{ ok: boolean }>(`/api/lab-reports/${recordId}`, {
        method: "DELETE",
      }),
    onMutate: async (recordId) => {
      await qc.cancelQueries({ queryKey: lrKey });
      const snapshot = qc.getQueryData<LabReportRecord[]>(lrKey);
      qc.setQueryData<LabReportRecord[]>(lrKey, (old = []) =>
        old.filter((r) => r.id !== recordId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(lrKey, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: lrKey });
    },
  });
}

/** Re-run AI extraction for an existing lab report record. */
export function useReExtractLabReportMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<LabReportRecord>(`/api/lab-reports/${recordId}`, {
        method: "PATCH",
      }),
    onSuccess: (updated) => {
      const lrKey = [...chatKeys.labReports(), pid] as const;
      qc.setQueryData<LabReportRecord[]>(lrKey, (old = []) =>
        old.map((r) => (r.id === updated.id ? updated : r)),
      );
    },
  });
}

/** Link a chat session to a lab report (or update if already linked). */
export function useLinkLabReportSessionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: ({
      recordId,
      sessionId,
    }: {
      recordId: string;
      sessionId: string;
    }) =>
      apiFetch<LabReportRecord>(`/api/lab-reports/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify({ sessionId }),
        headers: { "Content-Type": "application/json" },
      }),
    onMutate: async ({ recordId, sessionId }) => {
      const lrKey = [...chatKeys.labReports(), pid] as const;
      await qc.cancelQueries({ queryKey: lrKey });
      const snapshot = qc.getQueryData<LabReportRecord[]>(lrKey);
      qc.setQueryData<LabReportRecord[]>(lrKey, (old = []) =>
        old.map((r) => (r.id === recordId ? { ...r, sessionId } : r)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        const lrKey = [...chatKeys.labReports(), pid] as const;
        qc.setQueryData(lrKey, ctx.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [...chatKeys.labReports(), pid],
      });
    },
  });
}

// ── Vitals ────────────────────────────────────────────────────────────────────

export interface VitalRecord {
  id: string;
  userId: string;
  weightKg?: number;
  heightCm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  restingHr?: number;
  spo2?: number;
  temperatureC?: number;
  respiratoryRate?: number;
  glucoseMgdl?: number;
  bmi?: number;
  bpCategory?: string;
  hrCategory?: string;
  spo2Category?: string;
  tempCategory?: string;
  glucoseCategory?: string;
  measuredAt: string;
  createdAt: string;
}

export interface AddVitalPayload {
  weightKg?: number;
  heightCm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  restingHr?: number;
  spo2?: number;
  temperatureC?: number;
  respiratoryRate?: number;
  glucoseMgdl?: number;
  measuredAt?: string;
}

export function useVitalsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.vitals(), pid],
    queryFn: () => apiFetch<VitalRecord[]>("/api/vitals"),
    staleTime: 30_000,
  });
}

export function useAddVitalMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.vitals(), pid] as const;
  return useMutation({
    mutationFn: (payload: AddVitalPayload) =>
      apiFetch<VitalRecord>("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<VitalRecord[]>(key);
      const now = new Date().toISOString();
      const optimistic: VitalRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        ...payload,
        measuredAt: payload.measuredAt ?? now,
        createdAt: now,
      };
      qc.setQueryData<VitalRecord[]>(key, (old = []) => [optimistic, ...old]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<VitalRecord[]>(key, (old = []) =>
        old.map((v) => (v.id.startsWith("__optimistic__") ? newRecord : v)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      void revalidateVitals();
    },
  });
}

export function useDeleteVitalMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.vitals(), pid] as const;
  return useMutation({
    mutationFn: (vitalId: string) =>
      apiFetch<{ ok: boolean }>(`/api/vitals/${vitalId}`, {
        method: "DELETE",
      }),
    onMutate: async (vitalId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<VitalRecord[]>(key);
      qc.setQueryData<VitalRecord[]>(key, (old = []) =>
        old.filter((v) => v.id !== vitalId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      void revalidateVitals();
    },
  });
}
