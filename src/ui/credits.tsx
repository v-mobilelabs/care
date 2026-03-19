"use client";
import { useCreditsQuery } from "@/app/(portal)/patient/_query";
import { Badge, Loader, Skeleton, Tooltip } from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import Link, { useLinkStatus } from "@/ui/link";
import { useEffect, useRef, useState } from "react";

function AnimatedCredits({ credits }: Readonly<{ credits: number }>) {
    const { pending } = useLinkStatus();
    const [displayed, setDisplayed] = useState(credits);
    const [animating, setAnimating] = useState(false);
    const prevRef = useRef(credits);

    useEffect(() => {
        if (credits !== prevRef.current) {
            setAnimating(true);
            const t = setTimeout(() => {
                setDisplayed(credits);
                setAnimating(false);
                prevRef.current = credits;
            }, 150);
            return () => clearTimeout(t);
        }
    }, [credits]);

    if (pending) return <Loader size={12} />;

    return (
        <span
            style={{
                display: "inline-block",
                transition: "opacity 150ms ease, transform 150ms ease",
                opacity: animating ? 0 : 1,
                transform: animating ? "translateY(-4px)" : "translateY(0)",
            }}
        >
            {displayed}
        </span>
    );
}

export function Credits() {
    const { data: usage, isPending } = useCreditsQuery();

    if (isPending || !usage) {
        return <Skeleton height={18} width={45} radius="xl" />;
    }

    const credits = usage.credits;
    const minutes = usage.minutes;
    const storage = usage.storage;
    const lastReset = usage.lastReset;
    let color = "teal";
    if (credits === 0) color = "red";
    else if (credits <= 3) color = "orange";

    return (
        <Tooltip
            label={`Credits: ${credits}, Minutes: ${minutes}, Storage: ${storage} (reset monthly, last: ${lastReset})`}
            withArrow
            position="bottom"
        >
            <Badge
                component={Link}
                href="/patient/usage"
                leftSection={<IconBolt size={13} />}
                color={color}
                variant="light"
                size="sm"
                style={{ cursor: "pointer" }}
            >
                <AnimatedCredits credits={credits} />
            </Badge>
        </Tooltip>
    );
}
