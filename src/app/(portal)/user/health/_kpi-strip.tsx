"use client";
import {
    Badge,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { MotionCard } from "@/ui/components/motion-card";
import type { ReactNode } from "react";
import {
    useVitalsQuery,
    useMedicationsQuery,
    useConditionsQuery,
    useAssessmentsQuery,
} from "@/app/(portal)/user/_query";

interface KpiPillProps {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    detail?: string;
    color: string;
}

function KpiPill({ icon, label, value, detail, color }: Readonly<KpiPillProps>) {
    return (
        <MotionCard interactive blobColor={color.includes("var") ? color : `var(--mantine-color-${color}-6)`} withBorder radius="xl" p="sm" style={{ flex: 1, minWidth: 140 }}>
            <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={36} radius="xl" variant="light" color={color}>
                    {icon}
                </ThemeIcon>
                <Stack gap={2}>
                    <Text size="xs" c="dimmed" fw={500} tt="uppercase" style={{ letterSpacing: "0.04em" }}>
                        {label}
                    </Text>
                    <Group gap={4} align="baseline">
                        <Text fw={700} size="lg" lh={1}>
                            {value}
                        </Text>
                        {detail && (
                            <Text size="xs" c="dimmed">
                                {detail}
                            </Text>
                        )}
                    </Group>
                </Stack>
            </Group>
        </MotionCard>
    );
}

function KpiPillSkeleton() {
    return (
        <MotionCard withBorder radius="xl" p="sm" style={{ flex: 1, minWidth: 140 }}>
            <Group gap="sm" wrap="nowrap">
                <Skeleton circle h={36} w={36} />
                <Stack gap={4}>
                    <Skeleton height={10} width={60} />
                    <Skeleton height={20} width={80} />
                </Stack>
            </Group>
        </MotionCard>
    );
}

const RISK_COLOR: Record<string, string> = {
    low: "teal",
    moderate: "yellow",
    high: "orange",
    emergency: "red",
};

export function KpiStrip() {
    const { data: vitals, isLoading: loadingVitals } = useVitalsQuery();
    const { data: medications, isLoading: loadingMeds } = useMedicationsQuery();
    const { data: conditions, isLoading: loadingConditions } = useConditionsQuery();
    const { data: assessments, isLoading: loadingAssessments } = useAssessmentsQuery();

    const isLoading = loadingVitals || loadingMeds || loadingConditions || loadingAssessments;

    if (isLoading) {
        return (
            <Group gap="sm" wrap="nowrap" style={{ overflowX: "auto", paddingBottom: 4 }}>
                <KpiPillSkeleton />
                <KpiPillSkeleton />
                <KpiPillSkeleton />
                <KpiPillSkeleton />
            </Group>
        );
    }

    // Latest BP
    const latestVital = vitals
        ?.filter((v) => v.systolicBp !== undefined)
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];

    const bpValue = latestVital?.systolicBp
        ? `${latestVital.systolicBp}/${latestVital.diastolicBp}`
        : "—";
    const bpDetail = latestVital?.bpCategory;

    // Active medications count (flat across pages)
    const activeMedsCount = (medications ?? []).filter((m) => m.status === "active").length;

    // Active conditions
    const confirmedConditions = (conditions ?? []).filter((c) => c.status === "confirmed").length;

    // Latest assessment risk
    const latestAssessment = assessments?.[0];
    const riskLevel = latestAssessment?.riskLevel ?? null;

    return (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <KpiPill
                icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l8.42 8.42 8.42-8.42a5.4 5.4 0 0 0 0-7.65z" />
                    </svg>
                }
                label="Blood Pressure"
                value={bpValue}
                detail={bpDetail ?? "mmHg"}
                color="red"
            />
            <KpiPill
                icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                    </svg>
                }
                label="Medications"
                value={activeMedsCount}
                detail="active"
                color="blue"
            />
            <KpiPill
                icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                }
                label="Conditions"
                value={confirmedConditions}
                detail="confirmed"
                color="indigo"
            />
            <MotionCard interactive blobColor={riskLevel ? `var(--mantine-color-${RISK_COLOR[riskLevel]}-6)` : "var(--mantine-color-gray-6)"} withBorder radius="xl" p="sm" style={{ flex: 1, minWidth: 140 }}>
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                        size={36}
                        radius="xl"
                        variant="light"
                        color={riskLevel ? RISK_COLOR[riskLevel] : "gray"}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </ThemeIcon>
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed" fw={500} tt="uppercase" style={{ letterSpacing: "0.04em" }}>
                            Risk Level
                        </Text>
                        {riskLevel ? (
                            <Badge size="sm" variant="light" color={RISK_COLOR[riskLevel]}>
                                {riskLevel}
                            </Badge>
                        ) : (
                            <Text fw={700} size="lg" lh={1}>—</Text>
                        )}
                    </Stack>
                </Group>
            </MotionCard>
        </SimpleGrid>
    );
}
