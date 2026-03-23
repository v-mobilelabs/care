"use client";

import {
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
    Paper,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconCheck,
    IconClipboardHeart,
    IconExternalLink,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAssessmentQuery } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import Link from "@/ui/link";

type AssessmentRisk = "low" | "moderate" | "high" | "emergency";

const RISK_COLOR: Record<AssessmentRisk, string> = {
    low: colors.success,
    moderate: colors.warning,
    high: colors.danger,
    emergency: colors.danger,
};

function Header({ title, onBack }: Readonly<{ title: string; onBack: () => void }>) {
    return (
        <Group gap="sm" align="center">
            <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconArrowLeft size={14} />}
                onClick={onBack}
            >
                Back
            </Button>
            <ThemeIcon size={34} radius="md" color="primary" variant="light">
                <IconClipboardHeart size={18} />
            </ThemeIcon>
            <Box style={{ minWidth: 0, flex: 1 }}>
                <Title order={4} lh={1.2} lineClamp={2}>
                    {title}
                </Title>
            </Box>
        </Group>
    );
}

function MetaBadges({
    riskLevel,
    status,
    specialtyAgent,
    condition,
    qaCount,
}: Readonly<{
    riskLevel?: AssessmentRisk;
    status?: "active" | "completed" | "abandoned";
    specialtyAgent?: string;
    condition?: string;
    qaCount: number;
}>) {
    const riskColor = riskLevel ? RISK_COLOR[riskLevel] : "gray";

    return (
        <Group gap={6} wrap="wrap">
            {riskLevel ? (
                <Badge size="sm" variant="light" color={riskColor}>
                    {riskLevel} risk
                </Badge>
            ) : null}
            {status ? (
                <Badge size="sm" variant="light" color="gray">
                    {status}
                </Badge>
            ) : null}
            {specialtyAgent ? (
                <Badge size="sm" variant="light" color="primary">
                    {specialtyAgent}
                </Badge>
            ) : null}
            {condition ? (
                <Badge size="sm" variant="outline" color="gray">
                    {condition}
                </Badge>
            ) : null}
            <Badge size="sm" variant="light" color="teal">
                {qaCount} Q&amp;A
            </Badge>
        </Group>
    );
}

function Guidelines({
    guidelines,
}: Readonly<{
    guidelines: string[];
}>) {
    if (guidelines.length === 0) return null;

    return (
        <Stack gap={8}>
            <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
            >
                Guidelines Followed
            </Text>
            <Group gap={6} wrap="wrap">
                {guidelines.map((guideline) => (
                    <Badge key={guideline} size="sm" variant="outline" color="indigo">
                        {guideline}
                    </Badge>
                ))}
            </Group>
        </Stack>
    );
}

function ActionCards({
    cards,
}: Readonly<{
    cards: Array<{
        title: string;
        items: string[];
        disclaimer?: string;
    }>;
}>) {
    if (cards.length === 0) return null;

    return (
        <Stack gap="sm">
            <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
            >
                Action Cards
            </Text>
            {cards.map((card, cardIndex) => (
                <Paper key={`${card.title}-${cardIndex}`} withBorder radius="md" p="sm">
                    <Stack gap={6}>
                        <Text size="sm" fw={600}>
                            {card.title}
                        </Text>
                        <Stack gap={4}>
                            {card.items.map((item, itemIndex) => (
                                <Group key={`${item}-${itemIndex}`} gap={6} wrap="nowrap" align="flex-start">
                                    <IconCheck
                                        size={14}
                                        color="var(--mantine-color-teal-6)"
                                        style={{ marginTop: 2, flexShrink: 0 }}
                                    />
                                    <Text size="sm">{item}</Text>
                                </Group>
                            ))}
                        </Stack>
                        {card.disclaimer ? (
                            <Text size="xs" c="dimmed" mt={2}>
                                {card.disclaimer}
                            </Text>
                        ) : null}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
}

function QaList({
    qa,
}: Readonly<{
    qa: Array<{ question: string; answer: string }>;
}>) {
    return (
        <Stack gap="sm">
            <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
            >
                Assessment Q&amp;A
            </Text>
            {qa.map((pair, index) => (
                <Paper key={`${pair.question}-${index}`} withBorder radius="md" p="sm">
                    <Stack gap={6}>
                        <Text size="sm" fw={600}>
                            {index + 1}. {pair.question}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {pair.answer}
                        </Text>
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
}

function NotFound({ onBack }: Readonly<{ onBack: () => void }>) {
    return (
        <Container pt="xl" pb="xl" size="md" style={{ textAlign: "center" }}>
            <ThemeIcon size={52} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                <IconClipboardHeart size={28} />
            </ThemeIcon>
            <Text fw={500}>Assessment not found</Text>
            <Button variant="light" mt="md" onClick={onBack}>
                Back to Assessments
            </Button>
        </Container>
    );
}

function DetailSkeleton() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Group gap="sm" align="center">
                    <Skeleton circle h={34} w={34} />
                    <Skeleton h={20} w={220} />
                </Group>
                <Skeleton h={220} radius="lg" />
                <Skeleton h={120} radius="lg" />
                <Skeleton h={180} radius="lg" />
            </Stack>
        </Container>
    );
}

export function AssessmentDetailContent(
    props: Readonly<{ assessmentId: string }>,
) {
    const { assessmentId } = props;
    const router = useRouter();
    const { data: assessment, isLoading } = useAssessmentQuery(assessmentId);

    const goBack = () => router.push("/patient/assessments");

    if (isLoading) {
        return <DetailSkeleton />;
    }

    if (!assessment) {
        return <NotFound onBack={goBack} />;
    }

    const guidelines = assessment.guidelinesFollowed?.length
        ? assessment.guidelinesFollowed
        : assessment.guideline
            ? [assessment.guideline]
            : [];

    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Header title={assessment.title} onBack={goBack} />

                <Paper withBorder radius="lg" p="md">
                    <Stack gap="sm">
                        <MetaBadges
                            riskLevel={assessment.riskLevel}
                            status={assessment.status}
                            specialtyAgent={assessment.specialtyAgent}
                            condition={assessment.condition}
                            qaCount={assessment.qa.length}
                        />

                        <Group gap="sm" wrap="wrap">
                            <Text size="xs" c="dimmed">
                                Started: {assessment.startedAt ? <DateText date={assessment.startedAt} /> : "—"}
                            </Text>
                            <Text size="xs" c="dimmed">
                                Updated: {assessment.updatedAt ? <DateText date={assessment.updatedAt} /> : "—"}
                            </Text>
                        </Group>

                        {assessment.summary ? (
                            <Text size="sm" c="dimmed" lh={1.7}>
                                {assessment.summary}
                            </Text>
                        ) : null}

                        <Button
                            component={Link}
                            href={`/patient/assistant?id=${assessment.sessionId}`}
                            size="xs"
                            variant="light"
                            color="gray"
                            leftSection={<IconExternalLink size={14} />}
                            w="fit-content"
                        >
                            Open source session
                        </Button>
                    </Stack>
                </Paper>

                <Guidelines guidelines={guidelines} />

                <ActionCards cards={assessment.actionCards ?? []} />

                <Divider />

                <QaList qa={assessment.qa} />
            </Stack>
        </Container>
    );
}
