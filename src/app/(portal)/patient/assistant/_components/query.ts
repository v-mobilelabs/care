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
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { chatKeys } from "@/app/(portal)/patient/_keys";
export { chatKeys } from "@/app/(portal)/patient/_keys";
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
  createdAt: string;
  updatedAt: string;
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

export interface ConditionRecord {
  id: string;
  userId: string;
  sessionId?: string;
  name: string;
  icd10?: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
  createdAt: string;
}

export interface SoapNoteRecord {
  id: string;
  userId: string;
  sessionId: string;
  condition: string;
  riskLevel: "low" | "moderate" | "high" | "emergency";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string[];
  createdAt: string;
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

export interface MedicationRecord {
  id: string;
  userId: string;
  sessionId?: string;
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
  const headers = new Headers((init?.headers as HeadersInit | undefined) ?? {});
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

/** Current daily credit balance for the authenticated user. */
export function useCreditsQuery() {
  return useQuery({
    queryKey: chatKeys.credits(),
    queryFn: () => apiFetch<UsageDto>("/api/credits"),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
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
    void qc.invalidateQueries({ queryKey: chatKeys.credits() });
  };
}

/** Invalidate the credits cache — call after each message is sent. */
export function useInvalidateCredits() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: chatKeys.credits() });
}

/** Invalidate the conditions cache — call after a message finishes streaming (AI tools may have saved new conditions). */
export function useInvalidateConditions() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    void qc.invalidateQueries({ queryKey: [...chatKeys.conditions(), pid] });
}

/** Invalidate the SOAP notes cache — call after a message finishes streaming (AI tools may have saved new notes). */
export function useInvalidateSoapNotes() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    void qc.invalidateQueries({ queryKey: [...chatKeys.soapNotes(), pid] });
}

/** Invalidate the messages cache — call after a message finishes streaming to refetch with usage data. */
export function useInvalidateMessages(sessionId: string) {
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
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
  const sessKey = [...chatKeys.sessions(), pid] as const;
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: sessKey });
      const snapshot = qc.getQueryData<SessionSummary[]>(sessKey);
      qc.setQueryData<SessionSummary[]>(sessKey, (old = []) =>
        old.filter((s) => s.id !== id),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(sessKey, ctx.snapshot);
    },
    onSettled: (_result, _err, id) => {
      void qc.invalidateQueries({ queryKey: sessKey });
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
      void qc.invalidateQueries({ queryKey: sessKey });
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
    void qc.invalidateQueries({ queryKey: [...chatKeys.sessions(), pid] });
}

/** Fetch all saved conditions for the authenticated user, sorted newest-first. */
export function useConditionsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.conditions(), pid],
    queryFn: () => apiFetch<ConditionRecord[]>("/api/conditions"),
    staleTime: 30_000,
  });
}

export interface AddConditionPayload {
  sessionId?: string;
  name: string;
  icd10?: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
}

/** Save a detected condition to the user's health records. */
export function useAddConditionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.conditions(), pid] as const;
  return useMutation({
    mutationFn: (payload: AddConditionPayload) =>
      apiFetch<ConditionRecord>("/api/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<ConditionRecord[]>(key);
      const optimistic: ConditionRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        sessionId: payload.sessionId,
        name: payload.name,
        icd10: payload.icd10,
        severity: payload.severity,
        status: payload.status,
        description: payload.description,
        symptoms: payload.symptoms,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ConditionRecord[]>(key, (old = []) => [
        optimistic,
        ...old,
      ]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<ConditionRecord[]>(key, (old = []) =>
        old.map((c) => (c.id.startsWith("__optimistic__") ? newRecord : c)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Fetch all SOAP notes for the authenticated user, sorted newest-first. */
export function useSoapNotesQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.soapNotes(), pid],
    queryFn: () => apiFetch<SoapNoteRecord[]>("/api/soap-notes"),
    staleTime: 30_000,
  });
}

/** Fetch a single SOAP note by ID. */
export function useSoapNoteQuery(noteId: string) {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.soapNote(noteId), pid],
    queryFn: () => apiFetch<SoapNoteRecord>(`/api/soap-notes/${noteId}`),
    staleTime: Infinity,
    enabled: !!noteId,
  });
}

/** Delete a SOAP note — optimistically removes it from the list cache. */
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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete a condition — optimistically removes it from the list cache. */
export function useDeleteConditionMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.conditions(), pid] as const;
  return useMutation({
    mutationFn: (conditionId: string) =>
      apiFetch<{ ok: boolean }>(`/api/conditions/${conditionId}`, {
        method: "DELETE",
      }),
    onMutate: async (conditionId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<ConditionRecord[]>(key);
      qc.setQueryData<ConditionRecord[]>(key, (old = []) =>
        old.filter((c) => c.id !== conditionId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Upload a single file to a session — persists metadata to Firestore and returns the FileDto. */
export function useUploadFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      file,
      dependentId,
    }: {
      sessionId: string;
      file: File;
      /** Pass activeDependentId from useActiveProfile() at the call site. */
      dependentId?: string;
    }): Promise<FileRecord> => {
      const formData = new FormData();
      formData.append("file", file);
      const headers: HeadersInit = {};
      if (dependentId) headers["x-dependent-id"] = dependentId;
      const res = await fetch(`/api/sessions/${sessionId}/files`, {
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
      void qc.invalidateQueries({ queryKey: chatKeys.files() });
      void qc.invalidateQueries({ queryKey: chatKeys.storageMetrics() });
      // Re-invalidate after a short delay to pick up the background AI classification label.
      setTimeout(() => {
        void qc.invalidateQueries({ queryKey: chatKeys.files() });
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

/** Fetch all files uploaded by the authenticated user across all sessions, newest-first. */
export function useFilesQuery() {
  return useQuery({
    queryKey: chatKeys.files(),
    queryFn: () => apiFetch<FileRecord[]>("/api/files"),
    staleTime: 30_000,
  });
}

/** Delete a single uploaded file — optimistically removes it from the list cache. */
export function useDeleteFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      fileId,
    }: {
      sessionId: string;
      fileId: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/sessions/${sessionId}/files/${fileId}`, {
        method: "DELETE",
      }),
    onMutate: async ({ fileId }) => {
      await qc.cancelQueries({ queryKey: chatKeys.files() });
      const snapshot = qc.getQueryData<FileRecord[]>(chatKeys.files());
      qc.setQueryData<FileRecord[]>(chatKeys.files(), (old = []) =>
        old.filter((f) => f.id !== fileId),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(chatKeys.files(), ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.files() });
      void qc.invalidateQueries({ queryKey: chatKeys.storageMetrics() });
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
      const uploadRes = await fetch(`/api/sessions/${tag}/files`, {
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
      void qc.invalidateQueries({
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
    mutationFn: ({ fileId }: { fileId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/prescriptions/${fileId}`, {
        method: "DELETE",
      }),
    onMutate: async ({ fileId }) => {
      await qc.cancelQueries({ queryKey: prescKey });
      const snapshot = qc.getQueryData<PrescriptionRecord[]>(prescKey);
      qc.setQueryData<PrescriptionRecord[]>(prescKey, (old = []) =>
        old.filter((p) => p.fileId !== fileId),
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

// ── Medications ───────────────────────────────────────────────────────────────

/** Fetch all medications for the authenticated user. */
export function useMedicationsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.medications(), pid],
    queryFn: () => apiFetch<MedicationRecord[]>("/api/medications"),
    staleTime: 30_000,
  });
}

/** Invalidate the medications cache. */
export function useInvalidateMedications() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    void qc.invalidateQueries({ queryKey: [...chatKeys.medications(), pid] });
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
  status?: "active" | "completed" | "discontinued" | "paused";
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
      void qc.invalidateQueries({ queryKey: key });
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
  status?: "active" | "completed" | "discontinued" | "paused";
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: key });
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
    void qc.invalidateQueries({ queryKey: [...chatKeys.dietPlans(), pid] });
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: chatKeys.doctors() });
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
  title: string;
  condition?: string;
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
    void qc.invalidateQueries({ queryKey: [...chatKeys.assessments(), pid] });
}

/** Invalidate the patient-summaries cache — call after a message finishes streaming. */
export function useInvalidatePatientSummaries() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return () =>
    void qc.invalidateQueries({
      queryKey: [...chatKeys.patientSummaries(), pid],
    });
}

// ── Drug Search ──────────────────────────────────────────────────────────────

export interface DrugStrengthRecord {
  label: string;
  dosage: string;
  form: string;
}

export interface DrugRecord {
  rxcuis: string[];
  name: string;
  strengths: DrugStrengthRecord[];
  defaultForm: string;
}

/**
 * Debounce-friendly query hook for drug name autocomplete.
 * Only fires when `q` is at least 2 characters.
 */
export function useDrugSearchQuery(q: string) {
  return useQuery({
    queryKey: chatKeys.drugs(q),
    queryFn: () =>
      apiFetch<DrugRecord[]>(`/api/drugs?q=${encodeURIComponent(q)}&limit=10`),
    enabled: q.trim().length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour — drug data rarely changes
    placeholderData: (prev) => prev,
  });
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
      void qc.invalidateQueries({ queryKey: key });
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
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
      void qc.invalidateQueries({ queryKey: chatKeys.profile() });
    },
  });
}

/** Saves the current timestamp as consentedAt on the user's profile (write-once). */
export function useConsentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ProfileRecord>("/api/patients/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentedAt: new Date().toISOString() }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.profile() });
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
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: key });
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
      void qc.invalidateQueries({ queryKey: chatKeys.dependents() });
    },
  });
}

// ── Insurance ─────────────────────────────────────────────────────────────────

export type InsuranceType =
  | "health"
  | "dental"
  | "vision"
  | "life"
  | "disability"
  | "other";

export interface InsuranceRecord {
  id: string;
  userId: string;
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  planName?: string;
  type: InsuranceType;
  subscriberName?: string;
  memberId?: string;
  effectiveDate?: string;
  expirationDate?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  notes?: string;
  documentStoragePath?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddInsurancePayload {
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  planName?: string;
  type?: InsuranceType;
  subscriberName?: string;
  memberId?: string;
  effectiveDate?: string;
  expirationDate?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  notes?: string;
  /** Draft GCS path from an extract upload — linked on creation */
  documentStoragePath?: string;
  documentUrl?: string;
}

export interface UpdateInsurancePayload extends Partial<AddInsurancePayload> {
  insuranceId: string;
}

/** Fetch all insurance records for the authenticated user (or active dependent). */
export function useInsuranceQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.insurance(), pid],
    queryFn: () => apiFetch<InsuranceRecord[]>("/api/insurance"),
    staleTime: 30_000,
  });
}

/** Add a new insurance record. */
export function useAddInsuranceMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.insurance(), pid] as const;
  return useMutation({
    mutationFn: (payload: AddInsurancePayload) =>
      apiFetch<InsuranceRecord>("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<InsuranceRecord[]>(key);
      const now = new Date().toISOString();
      const optimistic: InsuranceRecord = {
        id: `__optimistic__${Date.now()}`,
        userId: "",
        providerName: payload.providerName,
        policyNumber: payload.policyNumber,
        groupNumber: payload.groupNumber,
        planName: payload.planName,
        type: payload.type ?? "health",
        subscriberName: payload.subscriberName,
        memberId: payload.memberId,
        effectiveDate: payload.effectiveDate,
        expirationDate: payload.expirationDate,
        copay: payload.copay,
        deductible: payload.deductible,
        outOfPocketMax: payload.outOfPocketMax,
        notes: payload.notes,
        documentStoragePath: payload.documentStoragePath,
        documentUrl: payload.documentUrl,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<InsuranceRecord[]>(key, (old = []) => [
        optimistic,
        ...old,
      ]);
      return { snapshot };
    },
    onSuccess: (newRecord) => {
      qc.setQueryData<InsuranceRecord[]>(key, (old = []) =>
        old.map((r) => (r.id.startsWith("__optimistic__") ? newRecord : r)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Update an existing insurance record. */
export function useUpdateInsuranceMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.insurance(), pid] as const;
  return useMutation({
    mutationFn: ({ insuranceId, ...rest }: UpdateInsurancePayload) =>
      apiFetch<InsuranceRecord>(`/api/insurance/${insuranceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      }),
    onMutate: async ({ insuranceId, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<InsuranceRecord[]>(key);
      qc.setQueryData<InsuranceRecord[]>(key, (old = []) =>
        old.map((r) => (r.id === insuranceId ? { ...r, ...updates } : r)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete an insurance record — optimistically removes it from the list cache. */
export function useDeleteInsuranceMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const key = [...chatKeys.insurance(), pid] as const;
  return useMutation({
    mutationFn: (insuranceId: string) =>
      apiFetch<{ ok: boolean }>(`/api/insurance/${insuranceId}`, {
        method: "DELETE",
      }),
    onMutate: async (insuranceId) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<InsuranceRecord[]>(key);
      qc.setQueryData<InsuranceRecord[]>(key, (old = []) =>
        old.filter((r) => r.id !== insuranceId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Upload a document (insurance card / PDF) for an existing insurance record. */
export function useUploadInsuranceDocumentMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: async ({
      insuranceId,
      file,
    }: {
      insuranceId: string;
      file: File;
    }): Promise<InsuranceRecord> => {
      const formData = new FormData();
      formData.append("file", file);
      const headers = new Headers();
      if (pid) headers.set("x-dependent-id", pid);
      const res = await fetch(`/api/insurance/${insuranceId}/document`, {
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
      return res.json() as Promise<InsuranceRecord>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...chatKeys.insurance(), pid],
      });
    },
  });
}

// ── Extracted insurance data DTO ──────────────────────────────────────────────

export interface InsuranceExtracted {
  providerName?: string;
  planName?: string;
  policyNumber?: string;
  groupNumber?: string;
  memberId?: string;
  subscriberName?: string;
  type?: InsuranceType;
  effectiveDate?: string;
  expirationDate?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
}

export interface InsuranceExtractResponse {
  storagePath: string;
  documentUrl: string;
  extracted: InsuranceExtracted;
  extractionError?: string;
}

/**
 * Upload an insurance card / document and run AI extraction.
 * Returns pre-filled insurance fields plus the draft GCS path.
 * The caller is responsible for calling useAddInsuranceMutation with
 * the extracted fields + documentStoragePath + documentUrl to persist.
 */
export function useExtractInsuranceMutation() {
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: async (file: File): Promise<InsuranceExtractResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      const headers = new Headers();
      if (pid) headers.set("x-dependent-id", pid);
      const res = await fetch("/api/insurance/extract", {
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
      return res.json() as Promise<InsuranceExtractResponse>;
    },
  });
}

// ── Blood Tests ───────────────────────────────────────────────────────────────

export type BiomarkerStatus = "normal" | "low" | "high" | "critical";

export interface BiomarkerRecord {
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: BiomarkerStatus;
}

export interface BloodTestRecord {
  id: string;
  userId: string;
  fileId: string;
  sessionId: string;
  testName: string;
  labName?: string;
  orderedBy?: string;
  testDate?: string;
  notes?: string;
  biomarkers: BiomarkerRecord[];
  createdAt: string;
  updatedAt?: string;
}

/** Fetch all blood test records for the authenticated user (or active dependent). */
export function useBloodTestsQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.bloodTests(), pid],
    queryFn: () => apiFetch<BloodTestRecord[]>("/api/blood-tests"),
    staleTime: 30_000,
  });
}

/**
 * Upload a blood test file (image / PDF / doc) and auto-extract structured
 * data via AI. Returns the created BloodTestRecord on success.
 */
export function useUploadBloodTestMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: async (file: File): Promise<BloodTestRecord> => {
      const formData = new FormData();
      formData.append("file", file);
      const headers = new Headers();
      if (pid) headers.set("x-dependent-id", pid);
      const res = await fetch("/api/blood-tests", {
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
      return res.json() as Promise<BloodTestRecord>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...chatKeys.bloodTests(), pid] });
    },
  });
}

/** Delete a blood test record (and its underlying file). Optimistic update. */
export function useDeleteBloodTestMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const btKey = [...chatKeys.bloodTests(), pid] as const;
  return useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<{ ok: boolean }>(`/api/blood-tests/${recordId}`, {
        method: "DELETE",
      }),
    onMutate: async (recordId) => {
      await qc.cancelQueries({ queryKey: btKey });
      const snapshot = qc.getQueryData<BloodTestRecord[]>(btKey);
      qc.setQueryData<BloodTestRecord[]>(btKey, (old = []) =>
        old.filter((r) => r.id !== recordId),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(btKey, ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: btKey });
    },
  });
}

/** Re-run AI extraction for an existing blood test record. */
export function useReExtractBloodTestMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  return useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<BloodTestRecord>(`/api/blood-tests/${recordId}`, {
        method: "PATCH",
      }),
    onSuccess: (updated) => {
      const btKey = [...chatKeys.bloodTests(), pid] as const;
      qc.setQueryData<BloodTestRecord[]>(btKey, (old = []) =>
        old.map((r) => (r.id === updated.id ? updated : r)),
      );
    },
  });
}

// ── Patient Summaries ─────────────────────────────────────────────────────────

export interface PatientSummaryRecord {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  narrative: string;
  chiefComplaints: string[];
  diagnoses: Array<{ name: string; icd10?: string; status: string }>;
  medications: Array<{ name: string; dosage?: string; frequency?: string }>;
  vitals: Array<{ name: string; value: string; unit?: string }>;
  allergies: string[];
  riskFactors: string[];
  recommendations: string[];
  createdAt: string;
  updatedAt: string;
}

/** Fetch all patient summaries for the active profile. */
export function usePatientSummariesQuery() {
  const pid = useActiveDependentId();
  return useQuery({
    queryKey: [...chatKeys.patientSummaries(), pid],
    queryFn: () => apiFetch<PatientSummaryRecord[]>("/api/patient-summary"),
  });
}

/** Delete a patient summary by id with optimistic removal. */
export function useDeletePatientSummaryMutation() {
  const qc = useQueryClient();
  const pid = useActiveDependentId();
  const psKey = [...chatKeys.patientSummaries(), pid] as const;
  return useMutation({
    mutationFn: (summaryId: string) =>
      apiFetch<{ ok: boolean }>(`/api/patient-summary/${summaryId}`, {
        method: "DELETE",
      }),
    onMutate: async (summaryId) => {
      await qc.cancelQueries({ queryKey: psKey });
      const snapshot = qc.getQueryData<PatientSummaryRecord[]>(psKey);
      qc.setQueryData<PatientSummaryRecord[]>(psKey, (old = []) =>
        old.filter((r) => r.id !== summaryId),
      );
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot) {
        qc.setQueryData(psKey, context.snapshot);
      }
    },
  });
}
