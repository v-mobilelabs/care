"use client";
import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/ui/providers/auth-provider";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import type { SessionDto } from "@/data/sessions/models/session.model";

interface AIChatContextValue {
  /** Current active session ID */
  activeSessionId: string | null;
  /** Active session data */
  activeSession: SessionDto | null;
  /** Loading state for active session */
  loading: boolean;
  /** Create a new chat session and navigate to it */
  newSession: (title?: string) => Promise<void>;
  /** Switch to an existing session */
  switchSession: (sessionId: string) => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChat(): AIChatContextValue {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error("useAIChat must be used within AIChatProvider");
  }
  return ctx;
}

interface AIChatProviderProps {
  children: ReactNode;
  /** Current session ID from URL */
  sessionId: string | null;
  /** Profile ID for scoping sessions */
  profileId: string;
}

export function AIChatProvider({
  children,
  sessionId,
  profileId,
}: Readonly<AIChatProviderProps>) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active session data
  const {
    data: activeSession,
    isLoading,
  } = useQuery<SessionDto>({
    queryKey: chatKeys.session(sessionId ?? ""),
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID");
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!sessionId && !!user,
    staleTime: Infinity,
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json() as Promise<SessionDto>;
    },
    onSuccess: (data) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: chatKeys.sessions(profileId) });
      // Set the new session data
      queryClient.setQueryData(chatKeys.session(data.id), data);
    },
  });

  // Create new session and navigate to it
  const newSession = useCallback(
    async (title?: string) => {
      const session = await createSessionMutation.mutateAsync(title);
      router.push(`/patient?id=${session.id}`);
    },
    [createSessionMutation, router],
  );

  // Switch to existing session
  const switchSession = useCallback(
    (id: string) => {
      router.push(`/patient?id=${id}`);
    },
    [router],
  );

  const value = useMemo<AIChatContextValue>(
    () => ({
      activeSessionId: sessionId,
      activeSession: activeSession ?? null,
      loading: isLoading,
      newSession,
      switchSession,
    }),
    [sessionId, activeSession, isLoading, newSession, switchSession],
  );

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}
