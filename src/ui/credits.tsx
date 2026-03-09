"use client";
import { useCreditsQuery } from "@/app/(portal)/patient/_query";
import { Badge, Tooltip } from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { useRouter } from "next/navigation";


export function Credits() {
    const router = useRouter();
    const { data: credits, isPending } = useCreditsQuery();
    const remaining = credits?.remaining ?? 0;
    const total = credits?.total ?? 0;

    let color = "teal";
    if (remaining === 0) color = "red";
    else if (remaining <= 3) color = "orange";

    if (isPending) {
        return (
            <Badge color="gray" variant="light" size="sm">
                Loading...
            </Badge>
        );
    }

    return (
        <Tooltip
            label={`${remaining} of ${total} credits remaining today. Resets at midnight UTC.`}
            withArrow
            position="bottom"
        >
            <Badge
                leftSection={<IconBolt size={13} />}
                color={color}
                variant="light"
                size="sm"
                style={{ cursor: "pointer" }}
                onClick={() => router.push("/patient/usage")}
            >
                {remaining}
            </Badge>
        </Tooltip>
    );
}
