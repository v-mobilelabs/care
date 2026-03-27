"use client";
import { SimpleGrid, Stack, Title, Text, Group, ThemeIcon, Box } from "@mantine/core";
import {
    IconHeartbeat,
    IconPill,
    IconStethoscope,
    IconFlask,
    IconClipboardList,
    IconApple,
    IconNotes,
    IconFileText,
    IconActivity,
    IconShieldHeart,
} from "@tabler/icons-react";

import {
    useVitalsQuery,
    useMedicationsQuery,
    useConditionsQuery,
    useAssessmentsQuery,
    useLabReportsQuery,
    useDietPlansQuery,
    usePrescriptionsQuery,
} from "@/app/(portal)/user/_query";
import { KpiStrip } from "./_kpi-strip";
import { HealthCard } from "./_health-card";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function HealthHubContent() {
    const { data: vitals } = useVitalsQuery();
    const { data: medications } = useMedicationsQuery();
    const { data: conditions } = useConditionsQuery();
    const { data: assessments } = useAssessmentsQuery();
    const { data: labReports } = useLabReportsQuery();
    const { data: dietPlans } = useDietPlansQuery();
    const { data: prescriptions } = usePrescriptionsQuery();

    const latestVital = vitals
        ?.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];
    const activeConditions = (conditions ?? []).filter((c) => c.status !== "suspected").length;
    const activeMeds = (medications ?? []).filter((m) => m.status === "active").length;
    const latestAssessment = assessments?.[0];
    const latestLabReport = labReports
        ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const activeDietPlan = dietPlans?.[0];
    const latestPrescription = prescriptions
        ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return (
        <Stack gap="xl">
            {/* KPI Strip */}
            <KpiStrip />

            {/* Card Grid */}
            <Stack gap="sm">
                <Group gap="sm" align="center">
                    <ThemeIcon size={28} radius="xl" variant="light" color="indigo">
                        <IconShieldHeart size={16} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5} style={{ lineHeight: 1.2 }}>
                            Your Health
                        </Title>
                        <Text size="xs" c="dimmed">
                            Everything in one place
                        </Text>
                    </Box>
                </Group>

                <SimpleGrid
                    cols={{ base: 2, sm: 3, lg: 4 }}
                    spacing={{ base: "sm", sm: "md" }}
                >
                    <HealthCard
                        href="/user/health/vitals"
                        icon={<IconHeartbeat size={22} />}
                        color="red"
                        title="Vitals"
                        description="Track your blood pressure, heart rate, SpO₂, temperature, glucose, and weight."
                        meta={
                            latestVital
                                ? `Last recorded ${formatDate(latestVital.measuredAt)}`
                                : "No readings yet"
                        }
                    />
                    <HealthCard
                        href="/user/health/medications"
                        icon={<IconPill size={22} />}
                        color="blue"
                        title="Medications"
                        description="Manage your current medications, dosages, and schedules."
                        meta={activeMeds > 0 ? `${activeMeds} active` : "None active"}
                    />
                    <HealthCard
                        href="/user/health/conditions"
                        icon={<IconStethoscope size={22} />}
                        color="indigo"
                        title="Conditions"
                        description="Your diagnosed and monitored medical conditions."
                        meta={
                            activeConditions > 0
                                ? `${activeConditions} condition${activeConditions !== 1 ? "s" : ""}`
                                : "None recorded"
                        }
                    />
                    <HealthCard
                        href="/user/health/lab-reports"
                        icon={<IconFlask size={22} />}
                        color="violet"
                        title="Lab Reports"
                        description="Review your blood work, imaging, and diagnostic test results."
                        meta={
                            latestLabReport
                                ? `Last: ${formatDate(latestLabReport.createdAt)}`
                                : "No reports yet"
                        }
                    />
                    <HealthCard
                        href="/user/health/assessments"
                        icon={<IconClipboardList size={22} />}
                        color="teal"
                        title="Assessments"
                        description="AI-powered health assessments with risk scoring and recommendations."
                        meta={
                            latestAssessment
                                ? `Last: ${formatDate(latestAssessment.createdAt)}`
                                : "No assessments yet"
                        }
                    />
                    <HealthCard
                        href="/user/health/symptoms"
                        icon={<IconActivity size={22} />}
                        color="orange"
                        title="Symptoms"
                        description="Track and monitor your symptoms over time."
                        meta="Symptom log"
                    />
                    <HealthCard
                        href="/user/health/prescriptions"
                        icon={<IconNotes size={22} />}
                        color="cyan"
                        title="Prescriptions"
                        description="View and manage your prescriptions from doctors."
                        meta={
                            latestPrescription
                                ? `Last: ${formatDate(latestPrescription.createdAt)}`
                                : "No prescriptions yet"
                        }
                    />
                    <HealthCard
                        href="/user/health/diet-plans"
                        icon={<IconApple size={22} />}
                        color="green"
                        title="Diet Plans"
                        description="Your personalized nutrition and meal plans."
                        meta={activeDietPlan ? "Plan active" : "No plan yet"}
                    />
                    <HealthCard
                        href="/user/health/summary"
                        icon={<IconFileText size={22} />}
                        color="pink"
                        title="Health Summary"
                        description="Comprehensive AI-generated overview of your health status."
                        meta="Personalized summary"
                    />
                    <HealthCard
                        href="/user/health/records"
                        icon={<IconFileText size={22} />}
                        color="gray"
                        title="Records"
                        description="All your uploaded health documents and files."
                        meta="Documents & files"
                    />
                </SimpleGrid>
            </Stack>
        </Stack>
    );
}
