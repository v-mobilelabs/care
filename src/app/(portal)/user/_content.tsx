"use client";
import type { ComponentType } from "react";
import { useEffect } from "react";
import {
    Alert,
    Badge,
    Box,
    Button,
    Container,
    Group,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconArrowRight,
    IconBolt,
    IconBrain,
    IconClipboardHeart,
    IconClipboardText,
    IconClockHour4,
    IconHeartbeat,
    IconMessageChatbot,
    IconPill,
    IconReportMedical,
    IconSparkles,
    IconStethoscope,
} from "@tabler/icons-react";
import Link from "@/ui/link";
import {
    useAssessmentsQuery,
    useCreditsQuery,
    useProfileQuery,
    useVitalsQuery,
    useReferralsInfiniteQuery,
} from "@/app/(portal)/user/_query";
import { usePatientSummariesQuery } from "@/ui/ai/query";
import { colors } from "@/ui/tokens";
import { trackEvent } from "@/lib/analytics";
import type { ReferralStatus } from "@/data/referrals/models/referral.model";

type QuickAction = Readonly<{
    href: string;
    title: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
    color: string;
}>;

type MetricCardProps = Readonly<{
    title: string;
    value: string;
    subtitle: string;
    icon: ComponentType<{ size?: number }>;
    color: string;
}>;

type SurfaceLinkCardProps = Readonly<{
    action: QuickAction;
    onOpen: (action: QuickAction) => void;
}>;

type ActivityCardProps = Readonly<{
    title: string;
    description: string;
    href: string;
    badge: string;
    icon: ComponentType<{ size?: number }>;
    color: string;
    onOpen: () => void;
}>;

type ValueSignalCardProps = Readonly<{
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
    color: string;
}>;

const QUICK_ACTIONS: QuickAction[] = [
    {
        href: "/user/assistant",
        title: "Start with the assistant",
        description: "Describe symptoms, upload files, or ask a health question.",
        icon: IconMessageChatbot,
        color: colors.brand,
    },
    {
        href: "/user/health/assessments",
        title: "Review assessments",
        description: "See structured Q&A, risk levels, and next-step guidance.",
        icon: IconClipboardHeart,
        color: colors.success,
    },
    {
        href: "/user/health/vitals",
        title: "Log your vitals",
        description: "Track blood pressure, heart rate, glucose, weight, and more.",
        icon: IconHeartbeat,
        color: colors.info,
    },
    {
        href: "/user/health/summary",
        title: "Open care summaries",
        description: "View your saved health summaries and key recommendations.",
        icon: IconClipboardText,
        color: colors.warning,
    },
    {
        href: "/user/health/prescriptions",
        title: "Check prescriptions",
        description: "Review extracted or AI-generated medication guidance.",
        icon: IconPill,
        color: colors.danger,
    },
    {
        href: "/user/health/lab-reports",
        title: "Upload lab reports",
        description: "Add blood work, imaging, or test results for analysis.",
        icon: IconReportMedical,
        color: colors.info,
    },
    {
        href: "/user/referrals",
        title: "Review referrals",
        description: "Track specialist referrals and next steps from CareAI.",
        icon: IconStethoscope,
        color: colors.warning,
    },
    {
        href: "/user/history",
        title: "Continue past chats",
        description: "Return to earlier sessions and keep your care journey connected.",
        icon: IconClockHour4,
        color: colors.muted,
    },
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function formatShortDate(value?: string): string {
    if (!value) return "No activity yet";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No activity yet";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(date);
}

function getFirstName(name?: string): string {
    const firstName = name?.trim().split(" ")[0];
    return firstName && firstName.length > 0 ? firstName : "there";
}

function getAssessmentDescription(
    latestAssessment?: {
        title: string;
        summary?: string;
    },
): string {
    if (!latestAssessment) {
        return "Start your first structured assessment to turn symptoms into a clearer action plan.";
    }

    if (latestAssessment.summary) {
        return `${latestAssessment.title} — ${latestAssessment.summary}`;
    }

    return latestAssessment.title;
}

function getSummaryDescription(
    latestSummary?: {
        narrative: string;
    },
): string {
    if (!latestSummary) {
        return "Care summaries give you a more reusable snapshot of what CareAI found and what to review next.";
    }

    return latestSummary.narrative;
}

function MetricCard(props: MetricCardProps) {
    const { title, value, subtitle, icon: Icon, color } = props;

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={6}>
                    <Text
                        size="xs"
                        c="dimmed"
                        fw={600}
                        style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                    >
                        {title}
                    </Text>
                    <Text fw={800} style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", lineHeight: 1 }}>
                        {value}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {subtitle}
                    </Text>
                </Stack>

                <ThemeIcon size={42} radius="md" color={color} variant="light">
                    <Icon size={22} />
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

function SurfaceLinkCard(props: SurfaceLinkCardProps) {
    const { action, onOpen } = props;
    const { href, title, description, icon: Icon, color } = action;

    return (
        <Paper
            component={Link}
            href={href}
            onClick={() => onOpen(action)}
            withBorder
            radius="lg"
            p="md"
            style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
        >
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
                <ThemeIcon size={42} radius="md" color={color} variant="light">
                    <Icon size={22} />
                </ThemeIcon>
                <IconArrowRight size={18} color="var(--mantine-color-dimmed)" />
            </Group>

            <Stack gap={4}>
                <Text fw={700} size="sm">
                    {title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.5}>
                    {description}
                </Text>
            </Stack>
        </Paper>
    );
}

function ActivityCard(props: ActivityCardProps) {
    const { title, description, href, badge, icon: Icon, color, onOpen } = props;

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={38} radius="md" color={color} variant="light">
                        <Icon size={20} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={700} size="sm">
                            {title}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {badge}
                        </Text>
                    </Box>
                </Group>
            </Group>

            <Text size="sm" c="dimmed" mb="md" lh={1.6}>
                {description}
            </Text>

            <Button component={Link} href={href} onClick={onOpen} variant="light" color={color} rightSection={<IconArrowRight size={16} />}>
                Open
            </Button>
        </Paper>
    );
}

type ReferralsSectionProps = Readonly<{
    referrals: Array<{
        id: string;
        specialist: string;
        reason: string;
        status: ReferralStatus;
    }>;
    isLoading: boolean;
    count: number;
}>;

/* eslint-disable-next-line max-lines-per-function */
function ReferralsSection({ referrals, isLoading, count }: ReferralsSectionProps) {
    if (isLoading) {
        return (
            <Stack gap="md">
                <Box>
                    <Title order={4}>Your referrals</Title>
                    <Text size="sm" c="dimmed">
                        Track specialist recommendations from CareAI.
                    </Text>
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {["referral-skeleton-a", "referral-skeleton-b"].map((key) => (
                        <Paper key={key} withBorder radius="lg" p="md">
                            <Skeleton height={120} />
                        </Paper>
                    ))}
                </SimpleGrid>
            </Stack>
        );
    }

    if (referrals.length === 0) {
        return (
            <Stack gap="md">
                <Box>
                    <Title order={4}>Your referrals</Title>
                    <Text size="sm" c="dimmed">
                        Track specialist recommendations from CareAI.
                    </Text>
                </Box>
                <Paper withBorder radius="lg" p="xl" ta="center">
                    <Stack gap="sm" align="center">
                        <ThemeIcon size={48} radius="md" color="blue" variant="light">
                            <IconStethoscope size={24} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">
                                No active referrals yet
                            </Text>
                            <Text size="xs" c="dimmed">
                                When CareAI recommends a specialist, they&apos;ll appear here.
                            </Text>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        );
    }

    const referralStatusColor: Record<ReferralStatus, string> = {
        pending: colors.warning,
        accepted: colors.success,
        dismissed: "gray",
        completed: "primary",
    };

    const referralStatusLabel: Record<ReferralStatus, string> = {
        pending: "Pending",
        accepted: "In progress",
        dismissed: "Dismissed",
        completed: "Completed",
    };

    return (
        <Stack gap="md">
            <Group justify="space-between" align="end">
                <Box>
                    <Title order={4}>Your referrals</Title>
                    <Text size="sm" c="dimmed">
                        {count} active referral{count === 1 ? "" : "s"} from CareAI recommendations.
                    </Text>
                </Box>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {referrals.slice(0, 2).map((referral) => (
                    <ActivityCard
                        key={referral.id}
                        title={referral.specialist}
                        description={referral.reason}
                        href="/user/referrals"
                        badge={referralStatusLabel[referral.status]}
                        icon={IconStethoscope}
                        color={referralStatusColor[referral.status]}
                        onOpen={() =>
                            trackEvent({
                                name: "health_record_viewed",
                                params: {
                                    action: "referral_card_opened",
                                    specialist: referral.specialist,
                                    surface: "patient_home",
                                },
                            })
                        }
                    />
                ))}
            </SimpleGrid>

            {count > 2 && (
                <Button
                    component={Link}
                    href="/user/referrals"
                    variant="light"
                    color="primary"
                    rightSection={<IconArrowRight size={16} />}
                >
                    Review all {count} referrals
                </Button>
            )}
        </Stack>
    );
}

function ValueSignalCard(props: ValueSignalCardProps) {
    const { title, value, description, icon: Icon, color } = props;

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
                <Stack gap={2}>
                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {title}
                    </Text>
                    <Text fw={800} style={{ fontSize: "clamp(1.2rem, 3vw, 1.6rem)", lineHeight: 1.1 }}>
                        {value}
                    </Text>
                </Stack>
                <ThemeIcon size={36} radius="md" color={color} variant="light">
                    <Icon size={18} />
                </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" lh={1.6}>
                {description}
            </Text>
        </Paper>
    );
}

function getLatestActivityDate(
    assessments: Array<{ updatedAt?: string; createdAt: string }>,
    vitals: Array<{ measuredAt: string }>,
    summaries: Array<{ updatedAt?: string; createdAt: string }>,
): string | undefined {
    const values = [
        ...assessments.map((assessment) => assessment.updatedAt ?? assessment.createdAt),
        ...vitals.map((vital) => vital.measuredAt),
        ...summaries.map((summary) => summary.updatedAt ?? summary.createdAt),
    ];

    if (values.length === 0) {
        return undefined;
    }

    return values.toSorted((a, b) => b.localeCompare(a))[0];
}

function normalizeArrayData<T>(
    data: unknown,
    options?: Readonly<{ collectionKey?: string }>,
): T[] {
    if (Array.isArray(data)) {
        return data as T[];
    }

    if (options?.collectionKey && data && typeof data === "object") {
        const nested = (data as Record<string, unknown>)[options.collectionKey];
        if (Array.isArray(nested)) {
            return nested as T[];
        }
    }

    return [];
}

function getContinuityLabel(totalArtifacts: number): string {
    if (totalArtifacts === 0) return "Starting";
    if (totalArtifacts < 5) return "Building";
    if (totalArtifacts < 12) return "Strong";
    return "Established";
}

function getCreditsHealthLabel(credits?: number): string {
    if (credits === undefined) return "Loading";
    if (credits <= 10) return "Low";
    if (credits <= 30) return "Watch";
    return "Healthy";
}

type HomeHeroProps = Readonly<{ firstName: string }>;

function HomeHero({ firstName }: HomeHeroProps) {
    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
                <Stack gap={6}>
                    <Badge color="primary" variant="light" leftSection={<IconSparkles size={12} />}>
                        Your health workspace
                    </Badge>
                    <Title order={2} style={{ fontSize: "clamp(1.8rem, 4vw, 2.7rem)", lineHeight: 1.15 }}>
                        {getGreeting()}, {firstName}
                    </Title>
                    <Text size="sm" c="dimmed" maw={720} lh={1.7}>
                        CareAI is more than a health chatbot. It helps you turn conversations into structured assessments,
                        summaries, records, and next steps you can actually use.
                    </Text>
                </Stack>

                <ThemeIcon size={54} radius="xl" color="primary" variant="light" visibleFrom="sm">
                    <IconStethoscope size={28} />
                </ThemeIcon>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Paper withBorder radius="md" p="md">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconBrain size={18} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">
                                It remembers your care context
                            </Text>
                            <Text size="xs" c="dimmed" lh={1.5}>
                                Your history, summaries, and records help future guidance feel more relevant.
                            </Text>
                        </Box>
                    </Group>
                </Paper>

                <Paper withBorder radius="md" p="md">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="teal" variant="light">
                            <IconReportMedical size={18} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">
                                It creates structured outputs
                            </Text>
                            <Text size="xs" c="dimmed" lh={1.5}>
                                Assessments, vitals, prescriptions, and summaries make care easier to revisit.
                            </Text>
                        </Box>
                    </Group>
                </Paper>

                <Paper withBorder radius="md" p="md">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="orange" variant="light">
                            <IconArrowRight size={18} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">
                                It helps you act on next steps
                            </Text>
                            <Text size="xs" c="dimmed" lh={1.5}>
                                Use CareAI to decide what to review, save, monitor, or discuss with a clinician.
                            </Text>
                        </Box>
                    </Group>
                </Paper>
            </SimpleGrid>
        </Stack>
    );
}

type AtGlanceSectionProps = Readonly<{
    creditsValue: string;
    vitalsValue: string;
    assessmentsValue: string;
    summariesValue: string;
    referralsValue: string;
    vitals: Array<{ measuredAt: string }>;
    assessmentSubtitle: string;
    summarySubtitle: string;
}>;

function AtGlanceSection(props: AtGlanceSectionProps) {
    const {
        creditsValue,
        vitalsValue,
        assessmentsValue,
        summariesValue,
        referralsValue,
        vitals,
        assessmentSubtitle,
        summarySubtitle,
    } = props;

    return (
        <Stack gap="md">
            <Group justify="space-between" align="end">
                <Box>
                    <Title order={4}>At a glance</Title>
                    <Text size="sm" c="dimmed">
                        A quick view of your activity and available CareAI usage.
                    </Text>
                </Box>
            </Group>

            <SimpleGrid cols={{ base: 1, xs: 2, lg: 5 }} spacing="md">
                <MetricCard
                    title="Credits left"
                    value={creditsValue}
                    subtitle="Monthly CareAI messages remaining"
                    icon={IconBolt}
                    color="primary"
                />
                <MetricCard
                    title="Vitals logged"
                    value={vitalsValue}
                    subtitle={vitals.length > 0 ? `Latest ${formatShortDate(vitals[0]?.measuredAt)}` : "Start tracking your health signals"}
                    icon={IconHeartbeat}
                    color="blue"
                />
                <MetricCard
                    title="Assessments"
                    value={assessmentsValue}
                    subtitle={assessmentSubtitle}
                    icon={IconClipboardHeart}
                    color="teal"
                />
                <MetricCard
                    title="Summaries"
                    value={summariesValue}
                    subtitle={summarySubtitle}
                    icon={IconClipboardText}
                    color="orange"
                />
                <MetricCard
                    title="Referrals"
                    value={referralsValue}
                    subtitle={referralsValue === "0" ? "No pending referrals" : "Active specialist recommendations"}
                    icon={IconStethoscope}
                    color="blue"
                />
            </SimpleGrid>
        </Stack>
    );
}

type ValueSignalsSectionProps = Readonly<{
    continuityLabel: string;
    totalArtifacts: number;
    latestActivityDate?: string;
    creditsHealthLabel: string;
}>;

function ValueSignalsSection({ continuityLabel, totalArtifacts, latestActivityDate, creditsHealthLabel }: ValueSignalsSectionProps) {
    return (
        <Stack gap="md">
            <Box>
                <Title order={4}>Value signals</Title>
                <Text size="sm" c="dimmed">
                    Quick indicators that your care history is becoming more reusable over time.
                </Text>
            </Box>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <ValueSignalCard
                    title="Care continuity"
                    value={continuityLabel}
                    description={`${totalArtifacts} total records across assessments, vitals, and summaries.`}
                    icon={IconBrain}
                    color="primary"
                />
                <ValueSignalCard
                    title="Latest activity"
                    value={latestActivityDate ? formatShortDate(latestActivityDate) : "No activity"}
                    description="Recent updates improve context quality for follow-up guidance."
                    icon={IconClockHour4}
                    color="teal"
                />
                <ValueSignalCard
                    title="Usage health"
                    value={creditsHealthLabel}
                    description="Tracks whether your monthly message budget is in a safe range."
                    icon={IconBolt}
                    color="orange"
                />
            </SimpleGrid>
        </Stack>
    );
}

type QuickActionsSectionProps = Readonly<{
    onOpen: (action: QuickAction) => void;
}>;

function QuickActionsSection({ onOpen }: QuickActionsSectionProps) {
    return (
        <Stack gap="md">
            <Box>
                <Title order={4}>What you can do here today</Title>
                <Text size="sm" c="dimmed">
                    Jump straight into the parts of CareAI that turn a conversation into ongoing care.
                </Text>
            </Box>

            <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
                {QUICK_ACTIONS.map((action) => (
                    <SurfaceLinkCard key={action.href} action={action} onOpen={onOpen} />
                ))}
            </SimpleGrid>
        </Stack>
    );
}

type ActivitySectionProps = Readonly<{
    latestAssessment?: { id?: string; title: string; summary?: string; updatedAt?: string; createdAt: string };
    latestSummary?: { narrative: string; updatedAt?: string; createdAt: string };
    assessmentSubtitle: string;
    summarySubtitle: string;
    latestAssessmentDescription: string;
    latestSummaryDescription: string;
    onActivityOpen: (label: string, href: string) => void;
}>;

function ActivitySection(props: ActivitySectionProps) {
    const {
        latestAssessment,
        latestSummary,
        assessmentSubtitle,
        summarySubtitle,
        latestAssessmentDescription,
        latestSummaryDescription,
        onActivityOpen,
    } = props;

    const assessmentHref = latestAssessment ? `/user/health/assessments/${latestAssessment.id}` : "/user/assistant";
    const summaryHref = latestSummary ? "/user/health/summary" : "/user/assistant";

    return (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <ActivityCard
                title="Continue your latest assessment"
                description={latestAssessmentDescription}
                href={assessmentHref}
                badge={latestAssessment ? assessmentSubtitle : "No assessments yet"}
                icon={IconClipboardHeart}
                color="teal"
                onOpen={() => onActivityOpen("latest_assessment", assessmentHref)}
            />

            <ActivityCard
                title="Open your latest care summary"
                description={latestSummaryDescription}
                href={summaryHref}
                badge={latestSummary ? summarySubtitle : "No summaries yet"}
                icon={IconClipboardText}
                color="orange"
                onOpen={() => onActivityOpen("latest_summary", summaryHref)}
            />
        </SimpleGrid>
    );
}

/* eslint-disable-next-line max-lines-per-function */
export function PatientHomeContent() {
    const { data: profile } = useProfileQuery();
    const { data: usage, isLoading: usageLoading } = useCreditsQuery();
    const { data: vitalsData, isLoading: vitalsLoading } = useVitalsQuery();
    const { data: assessmentsData, isLoading: assessmentsLoading } = useAssessmentsQuery();
    const { data: summariesData, isLoading: summariesLoading } = usePatientSummariesQuery();
    const { data: referralsData, isLoading: referralsLoading } = useReferralsInfiniteQuery({
        status: "pending",
    });
    const vitals = normalizeArrayData<{ measuredAt: string }>(vitalsData);
    const assessments = normalizeArrayData<{ id?: string; title: string; summary?: string; updatedAt?: string; createdAt: string }>(
        assessmentsData,
        { collectionKey: "assessments" },
    );
    const summaries = normalizeArrayData<{ narrative: string; updatedAt?: string; createdAt: string }>(summariesData);
    const referrals = referralsData?.pages[0]?.referrals ?? [];
    const referralCount = referrals.length;

    const firstName = getFirstName(profile?.name);
    const latestAssessment = assessments[0];
    const latestSummary = summaries[0];

    const creditsValue = usageLoading ? "…" : String(usage?.credits ?? 0);
    const vitalsValue = vitalsLoading ? "…" : String(vitals.length);
    const assessmentsValue = assessmentsLoading ? "…" : String(assessments.length);
    const summariesValue = summariesLoading ? "…" : String(summaries.length);
    const referralsValue = referralsLoading ? "…" : String(referralCount);

    const assessmentSubtitle = latestAssessment
        ? `Latest update ${formatShortDate(latestAssessment.updatedAt ?? latestAssessment.createdAt)}`
        : "No structured assessments yet";

    const summarySubtitle = latestSummary
        ? `Latest summary ${formatShortDate(latestSummary.updatedAt ?? latestSummary.createdAt)}`
        : "No care summaries yet";

    const latestAssessmentDescription = getAssessmentDescription(latestAssessment);
    const latestSummaryDescription = getSummaryDescription(latestSummary);
    const latestActivityDate = getLatestActivityDate(assessments, vitals, summaries);
    const totalArtifacts = assessments.length + vitals.length + summaries.length;
    const continuityLabel = getContinuityLabel(totalArtifacts);
    const creditsHealthLabel = getCreditsHealthLabel(usage?.credits);

    useEffect(() => {
        trackEvent({
            name: "health_record_viewed",
            params: {
                action: "patient_home_viewed",
                surface: "patient_home",
                assessments_count: assessments.length,
                summaries_count: summaries.length,
                vitals_count: vitals.length,
                referrals_count: referralCount,
            },
        });
    }, [assessments.length, summaries.length, vitals.length, referralCount]);

    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Container py="md">
                <Stack gap="xl">
                    <HomeHero firstName={firstName} />
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="Need urgent care?"
                        color="orange"
                        variant="light"
                    >
                        <Group justify="space-between" align="center" wrap="nowrap">
                            <Text size="sm">
                                For urgent symptoms or high-risk concerns, connect with a licensed doctor immediately.
                            </Text>
                            <Button
                                component={Link}
                                href="/user/connect"
                                size="xs"
                                color="orange"
                                variant="filled"
                                rightSection={<IconArrowRight size={14} />}
                            >
                                Find a doctor
                            </Button>
                        </Group>
                    </Alert>
                    <AtGlanceSection
                        creditsValue={creditsValue}
                        vitalsValue={vitalsValue}
                        assessmentsValue={assessmentsValue}
                        summariesValue={summariesValue}
                        referralsValue={referralsValue}
                        vitals={vitals}
                        assessmentSubtitle={assessmentSubtitle}
                        summarySubtitle={summarySubtitle}
                    />
                    <ValueSignalsSection
                        continuityLabel={continuityLabel}
                        totalArtifacts={totalArtifacts}
                        latestActivityDate={latestActivityDate}
                        creditsHealthLabel={creditsHealthLabel}
                    />
                    <ReferralsSection
                        referrals={referrals}
                        isLoading={referralsLoading}
                        count={referralCount}
                    />
                    <QuickActionsSection
                        onOpen={(action) => {
                            trackEvent({
                                name: "health_record_viewed",
                                params: {
                                    action: "patient_home_quick_action",
                                    label: action.title,
                                    href: action.href,
                                    surface: "patient_home",
                                },
                            });
                        }}
                    />
                    <ActivitySection
                        latestAssessment={latestAssessment}
                        latestSummary={latestSummary}
                        assessmentSubtitle={assessmentSubtitle}
                        summarySubtitle={summarySubtitle}
                        latestAssessmentDescription={latestAssessmentDescription}
                        latestSummaryDescription={latestSummaryDescription}
                        onActivityOpen={(label, href) => {
                            trackEvent({
                                name: "health_record_viewed",
                                params: {
                                    action: "patient_home_activity_open",
                                    label,
                                    href,
                                    surface: "patient_home",
                                },
                            });
                        }}
                    />
                </Stack>
            </Container>
        </ScrollArea>
    );
}