import { Paper } from "@mantine/core";
import Link from "@/ui/link";
import { SessionRowContent } from "./session-row-content";
import type { SessionSummary } from "@/app/(portal)/patient/_query";
import React from "react";

export function SessionRow({ session, isPendingDelete, onDelete }: Readonly<{
    session: SessionSummary;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    return (
        <Paper
            component={Link}
            href={`/patient/assistant?id=${session.id}`}
            withBorder
            radius="md"
            px="md"
            py="sm"
            style={{
                cursor: "pointer",
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                textDecoration: "none",
                display: "block",
                color: "inherit",
            }}
        >
            <SessionRowContent session={session} isPendingDelete={isPendingDelete} onDelete={onDelete} />
        </Paper>
    );
}
