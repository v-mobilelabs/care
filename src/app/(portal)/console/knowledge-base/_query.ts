"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { apiFetch } from "@/lib/api/fetch";
import type {
  KnowledgeBaseDto,
  PaginatedKnowledgeBase,
  KBEntryType,
  KBStatus,
} from "@/data/knowledge-base/models/knowledge-base.model";
import { colors } from "@/ui/tokens";

// ── Query keys ────────────────────────────────────────────────────────────────

export const kbKeys = {
  all: ["knowledge-base"] as const,
  list: (filters?: { category?: string; type?: string; status?: string }) =>
    ["knowledge-base", "list", filters ?? {}] as const,
  detail: (id: string) => ["knowledge-base", "detail", id] as const,
};

// ── List query ────────────────────────────────────────────────────────────────

interface KBListFilters {
  category?: string;
  type?: KBEntryType;
  status?: KBStatus;
  limit?: number;
  cursor?: string;
}

function buildListUrl(filters?: KBListFilters): string {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString();
  return `/api/knowledge-base${qs ? `?${qs}` : ""}`;
}

export function useKBListQuery(filters?: KBListFilters) {
  return useQuery({
    queryKey: kbKeys.list(filters),
    queryFn: () => apiFetch<PaginatedKnowledgeBase>(buildListUrl(filters)),
  });
}

// ── Detail query ──────────────────────────────────────────────────────────────

export function useKBDetailQuery(id: string | null) {
  return useQuery({
    queryKey: kbKeys.detail(id ?? ""),
    queryFn: () => apiFetch<KnowledgeBaseDto>(`/api/knowledge-base/${id}`),
    enabled: !!id,
  });
}

// ── Create mutation ───────────────────────────────────────────────────────────

interface CreateKBInput {
  title: string;
  type: KBEntryType;
  category: string;
  subcategory?: string;
  content: string;
  tags?: string[];
  source?: string;
  sourceUrl?: string;
}

export function useKBCreateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKBInput) =>
      apiFetch<KnowledgeBaseDto>("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      notifications.show({
        title: "Entry created",
        message: "Knowledge base entry added successfully.",
        color: colors.success,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Create failed",
        message: err.message,
        color: colors.danger,
      });
    },
  });
}

// ── Update mutation ───────────────────────────────────────────────────────────

interface UpdateKBInput {
  id: string;
  title?: string;
  type?: KBEntryType;
  category?: string;
  subcategory?: string;
  content?: string;
  tags?: string[];
  source?: string;
  sourceUrl?: string;
  status?: KBStatus;
}

export function useKBUpdateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateKBInput) =>
      apiFetch<KnowledgeBaseDto>(`/api/knowledge-base/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      qc.invalidateQueries({ queryKey: kbKeys.detail(variables.id) });
      notifications.show({
        title: "Entry updated",
        message: "Knowledge base entry saved.",
        color: colors.success,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Update failed",
        message: err.message,
        color: colors.danger,
      });
    },
  });
}

// ── Delete mutation ───────────────────────────────────────────────────────────

export function useKBDeleteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/knowledge-base/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      notifications.show({
        title: "Entry deleted",
        message: "Knowledge base entry removed.",
        color: colors.success,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Delete failed",
        message: err.message,
        color: colors.danger,
      });
    },
  });
}
