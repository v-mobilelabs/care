"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OnlineDoctorDto } from "@/data/meet/use-cases/list-online-doctors.use-case";
import type { CallRequestDto } from "@/data/meet";

// ── Keys ──────────────────────────────────────────────────────────────────────

export const meetKeys = {
  onlineDoctors: () => ["meet", "doctors"] as const,
  activeCall: () => ["meet", "active-call"] as const,
};

// ── Fetch online doctors ──────────────────────────────────────────────────────

export function useOnlineDoctors() {
  return useQuery<OnlineDoctorDto[]>({
    queryKey: meetKeys.onlineDoctors(),
    queryFn: async () => {
      const res = await fetch("/api/meet/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json() as Promise<OnlineDoctorDto[]>;
    },
    refetchInterval: 30_000, // refresh every 30s
  });
}

// ── Initiate call ─────────────────────────────────────────────────────────────

export function useInitiateCall() {
  const qc = useQueryClient();
  return useMutation<CallRequestDto, Error, { doctorId: string }>({
    mutationFn: async ({ doctorId }) => {
      const res = await fetch("/api/meet/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
      });
      if (!res.ok) {
        const err = (await res.json()) as {
          error?: { message?: string };
        };
        throw new Error(err.error?.message ?? "Failed to initiate call");
      }
      return res.json() as Promise<CallRequestDto>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: meetKeys.activeCall() });
    },
  });
}

// ── Cancel call ───────────────────────────────────────────────────────────────

export function useCancelCall() {
  const qc = useQueryClient();
  return useMutation<void, Error, { requestId: string }>({
    mutationFn: async ({ requestId }) => {
      const res = await fetch(
        `/api/meet/call?requestId=${encodeURIComponent(requestId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to cancel call");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: meetKeys.activeCall() });
    },
  });
}

// ── End call ──────────────────────────────────────────────────────────────────

export function useEndCall() {
  const qc = useQueryClient();
  return useMutation<void, Error, { requestId: string }>({
    mutationFn: async ({ requestId }) => {
      const res = await fetch(`/api/meet/${requestId}/end`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to end call");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: meetKeys.activeCall() });
    },
  });
}
