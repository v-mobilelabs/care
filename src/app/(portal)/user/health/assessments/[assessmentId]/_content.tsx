"use client";
import { MotionCard } from "@/ui/components/motion-card";

import {
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
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
    IconInfoCircle,
    IconPhone,
    IconShieldCheck,
    IconShare,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessmentQuery } from "@/app/(portal)/user/_query";
import { useShareArtifactMutation } from "@/app/(portal)/user/_query";
import { trackEvent } from "@/lib/analytics";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import Link from "@/ui/link";

import { ShareArtifactModal } from "@/ui/chat/components/share-artifact-modal";
type AssessmentRisk = "low" | "moderate" | "high" | "emergency";

const RISK_COLOR: Record<AssessmentRisk, string> = {
    low: colors.success,
    moderate: colors.warning,
    high: colors.danger,
    emergency: colors.danger,
};

const RISK_EXPLANATION: Record<AssessmentRisk, Readonly<{
    title: string;
    summary: string;
    nextStep: string;
}>> = {
    low: {
        title: "Low risk means monitoring and self-care may be reasonable",
        summary:
            "Your answers did not show strong warning signs in this assessment, but that does not rule out all medical issues.",
        nextStep:
            "Keep an eye on your symptoms, review the action cards, and get follow-up care if things change or worsen.",
    },
    moderate: {
        title: "Moderate risk means follow-up is worth taking seriously",
        summary:
            "Your answers suggest something that may need clinical review, even if it does not look like an immediate emergency from this assessment alone.",
        nextStep:
            "Use the next-step guidance, review your summary, and consider speaking with a clinician if symptoms persist or intensify.",
    },
    high: {
        title: "High risk means you should seek timely clinical attention",
        summary:
            "Your responses included patterns or red flags that deserve prompt medical review instead of wait-and-see behavior.",
        nextStep:
            "Prioritize clinician follow-up soon. If symptoms are escalating, use the consult flow or seek urgent medical care.",
    },
    emergency: {
        title: "Emergency risk means you should not rely on CareAI alone",
        summary:
            "This assessment detected serious warning signs that may require immediate in-person medical attention.",
        nextStep:
            "Call emergency services or go to urgent/emergency care immediately if you feel unsafe or symptoms are severe.",
    },
};

function getAssessmentConfidenceNote(guidelines: string[], qaCount: number): string {
    const guidelineCount = guidelines.length;

    if (guidelineCount > 0 && qaCount >= 5) {
        return "This assessment is stronger because it combines structured Q&A with named clinical guidance.";
    }

    if (guidelineCount > 0) {
        return "This assessment references named clinical guidance, but it should still be interpreted alongside your real-world symptoms and clinician advice.";
    }

    if (qaCount >= 5) {
        return "This assessment is based on a structured question flow, but it remains supportive guidance rather than a final diagnosis.";
    }

    return "This assessment is a helpful clinical snapshot, but it should be treated as decision support rather than a definitive medical conclusion.";
}

function getAssessmentBuiltFromText(
    qaCount: number,
    specialtyAgent?: string,
): string {
    const answerLabel = qaCount === 1 ? "answer" : "answers";

    if (specialtyAgent) {
        return `This assessment was built from ${qaCount} recorded ${answerLabel} and routed through ${specialtyAgent}.`;
    }

    return `This assessment was built from ${qaCount} recorded ${answerLabel}.`;
}

function getAssessmentGuidelines(
    assessment: Readonly<{
        guideline?: string;
        guidelinesFollowed?: string[];
    }>,
): string[] {
    if (assessment.guidelinesFollowed?.length) {
        return assessment.guidelinesFollowed;
    }

    if (assessment.guideline) {
        return [assessment.guideline];
    }

    return [];
}

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

function TrustExplainer({
    guidelines,
    qaCount,
    riskLevel,
    specialtyAgent,
}: Readonly<{
    guidelines: string[];
    qaCount: number;
    riskLevel?: AssessmentRisk;
    specialtyAgent?: string;
}>) {
    const explanation = riskLevel ? RISK_EXPLANATION[riskLevel] : null;
    const confidenceNote = getAssessmentConfidenceNote(guidelines, qaCount);
    const builtFromText = getAssessmentBuiltFromText(qaCount, specialtyAgent);
    const shouldEscalate = riskLevel === "high" || riskLevel === "emergency";

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="md">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon size={38} radius="md" color="primary" variant="light">
                        <IconShieldCheck size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5}>How to read this assessment</Title>
                        <Text size="sm" c="dimmed" lh={1.7}>
                            This page shows how CareAI interpreted your answers, what level of concern was detected,
                            and which clinical guidance shaped the result.
                        </Text>
                    </Box>
                </Group>

                <SimpleTrustGrid>
                    <TrustBlock
                        icon={<IconClipboardHeart size={16} />}
                        title="What it used"
                        description={builtFromText}
                    />
                    <TrustBlock
                        icon={<IconInfoCircle size={16} />}
                        title="How to interpret it"
                        description={confidenceNote}
                    />
                </SimpleTrustGrid>

                {explanation ? (
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                        withBorder
                        radius="md"
                        p="md"
                        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
                    >
                        <Stack gap={6}>
                            <Text fw={700} size="sm">
                                {explanation.title}
                            </Text>
                            <Text size="sm" c="dimmed" lh={1.7}>
                                {explanation.summary}
                            </Text>
                            <Text size="sm" fw={500}>
                                Next step: <Text component="span" fw={400} c="dimmed" inherit>{explanation.nextStep}</Text>
                            </Text>
                        </Stack>
                    </MotionCard>
                ) : null}

                {shouldEscalate ? (
                    <Group gap="sm" wrap="wrap">
                        <Button
                            component={Link}
                            href="/user/connect"
                            color="primary"
                            leftSection={<IconPhone size={16} />}
                        >
                            Consult a doctor
                        </Button>
                        <Text size="xs" c="dimmed" maw={420}>
                            Use this if you want faster clinician follow-up from inside the portal. If you feel unsafe, seek urgent or emergency care directly.
                        </Text>
                    </Group>
                ) : null}
            </Stack>
        </MotionCard>
    );
}

function SimpleTrustGrid({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <Group align="stretch" grow wrap="wrap">
            {children}
        </Group>
    );
}

function TrustBlock({
    icon,
    title,
    description,
}: Readonly<{
    icon: React.ReactNode;
    title: string;
    description: string;
}>) {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm" style={{ flex: 1, minWidth: 220 }}>
            <Stack gap={6}>
                <Group gap={6}>
                    <ThemeIcon size={28} radius="md" color="gray" variant="light">
                        {icon}
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                        {title}
                    </Text>
                </Group>
                <Text size="sm" c="dimmed" lh={1.6}>
                    {description}
                </Text>
            </Stack>
        </MotionCard>
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
                <MotionCard interactive blobColor="var(--mantine-color-primary-6)" key={`${card.title}-${cardIndex}`} withBorder radius="md" p="sm">
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
                </MotionCard>
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
                <MotionCard interactive blobColor="var(--mantine-color-primary-6)" key={`${pair.question}-${index}`} withBorder radius="md" p="sm">
                    <Stack gap={6}>
                        <Text size="sm" fw={600}>
                            {index + 1}. {pair.question}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {pair.answer}
                        </Text>
                    </Stack>
                </MotionCard>
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

    const [shareOpen, setShareOpen] = useState(false);
    const shareArtifact = useShareArtifactMutation();
    const goBack = () => router.push("/user/health/assessments");

    useEffect(() => {
        if (assessment?.status === "completed") {
            trackEvent({ name: "assessment_completed", params: { assessment_id: assessmentId } });
        }
    }, [assessment?.status, assessmentId]);

    async function handleShare(doctorId: string, message?: string) {
        await shareArtifact.mutateAsync({
            artifactType: "assessment",
            artifactId: assessmentId,
            doctorId,
            message,
        });
    }
    if (isLoading) {
        return <DetailSkeleton />;
    }

    if (!assessment) {
        return <NotFound onBack={goBack} />;
    }

    const guidelines = getAssessmentGuidelines(assessment);

    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Header title={assessment.title} onBack={goBack} />

                <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
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
                            href={`/user/assistant?id=${assessment.sessionId}`}
                            size="xs"
                            variant="light"
                            color="gray"
                            leftSection={<IconExternalLink size={14} />}
                            w="fit-content"
                        >
                            Open source session
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                leftSection={<IconShare size={14} />}
                                w="fit-content"
                                onClick={() => setShareOpen(true)}
                                loading={shareArtifact.isPending}
                            >
                                Share with doctor
                            </Button>
                        </Button>
                    </Stack>
                </MotionCard>

                <TrustExplainer
                    guidelines={guidelines}
                    qaCount={assessment.qa.length}
                    riskLevel={assessment.riskLevel}
                    specialtyAgent={assessment.specialtyAgent}
                />

                <Guidelines guidelines={guidelines} />

                <ActionCards cards={assessment.actionCards ?? []} />

                <Divider />

                <QaList qa={assessment.qa} />

                <ShareArtifactModal
                    isOpen={shareOpen}
                    onClose={() => setShareOpen(false)}
                    artifactType="assessment"
                    artifactId={assessmentId}
                    artifactName={assessment.title}
                    onShare={handleShare}
                />
            </Stack>
        </Container>
    );
}
