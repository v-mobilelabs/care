import { MotionCard } from "@/ui/components/motion-card";
import Link from "@/ui/link";
import { SessionRowContent } from "./session-row-content";
import type { SessionSummary } from "@/app/(portal)/user/_query";
import { trackEvent } from "@/lib/analytics";
import React from "react";

export function SessionRow({ session, isPendingDelete, onDelete }: Readonly<{
    session: SessionSummary;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    return (
        <Link
            href={`/user/assistant?id=${session.id}`}
            onClick={() => {
                trackEvent({
                    name: "health_record_viewed",
                    params: {
                        action: "open_history_session",
                        session_id: session.id,
                        agent_type: session.lastAgentType ?? "general",
                    },
                });
            }}
            style={{
                textDecoration: "none",
                display: "block",
                color: "inherit",
            }}
        >
            <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                withBorder
                shadow="xs"
                radius="md"
                px="sm"
                py="xs"
                style={{
                    cursor: "pointer",
                    opacity: isPendingDelete ? 0.4 : 1,
                    transition: "opacity 150ms ease, background 150ms ease",
                    borderColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-gray-8))",
                }}
            >
                <SessionRowContent session={session} isPendingDelete={isPendingDelete} onDelete={onDelete} />
            </MotionCard>
        </Link>
    );
}
