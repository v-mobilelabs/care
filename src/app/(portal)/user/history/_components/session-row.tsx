import { Paper } from "@mantine/core";
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
            <Paper
                withBorder={false}
                shadow="0"
                bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-9))"
                radius="md"
                px="md"
                py="sm"
                style={{
                    cursor: "pointer",
                    opacity: isPendingDelete ? 0.4 : 1,
                    transition: "opacity 150ms ease",
                }}
            >
                <SessionRowContent session={session} isPendingDelete={isPendingDelete} onDelete={onDelete} />
            </Paper>
        </Link>
    );
}
