"use client";
import { Button, Group, Paper, Stack, Text, Badge } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import type { SubmitReferralRequestInput } from "@/data/shared/service/agents/base/tools/submit-referral-request.tool";

export interface ReferralCardProps {
    data: SubmitReferralRequestInput;
    onConfirm: () => Promise<void>;
    onThankYou: () => Promise<void>;
    isLoading?: boolean;
}

function ReferralHeader({ nextSpecialist }: Readonly<{ nextSpecialist: string }>) {
    return (
        <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
                <Text fw={600} size="sm">Specialist Referral</Text>
                <Group gap={6} wrap="wrap" align="center">
                    <Text size="sm" c="dimmed" component="span">You have been referred to a</Text>
                    <Badge size="sm" variant="light" color="primary">{nextSpecialist}</Badge>
                    <Text size="sm" c="dimmed" component="span">specialist</Text>
                </Group>
            </Stack>
        </Group>
    );
}

function ReferralReason({ reason }: Readonly<{ reason?: string }>) {
    if (!reason) return null;
    return (
        <Text size="sm">
            <Text span fw={500}>Reason: </Text>
            {reason}
        </Text>
    );
}

interface ReferralActionsProps {
    nextSpecialist: string;
    isLoading: boolean;
    onProceed: () => Promise<void>;
    onThankYou: () => Promise<void>;
}

function runSafely(action: () => Promise<void>): void {
    action().catch(() => undefined);
}

function ReferralActions({
    nextSpecialist,
    isLoading,
    onProceed,
    onThankYou,
}: Readonly<ReferralActionsProps>) {
    const handleProceedClick = () => runSafely(onProceed);
    const handleThankYouClick = () => runSafely(onThankYou);

    return (
        <Group grow>
            <Button variant="light" color="primary" onClick={handleProceedClick} loading={isLoading} rightSection={<IconArrowRight size={16} />}>
                Proceed to {nextSpecialist}
            </Button>
            <Button variant="light" color="teal" onClick={handleThankYouClick} disabled={isLoading} rightSection={<IconCheck size={16} />}>
                Thank You
            </Button>
        </Group>
    );
}

interface ReferralCardLayoutProps {
    data: SubmitReferralRequestInput;
    isLoading: boolean;
    onProceed: () => Promise<void>;
    onThankYou: () => Promise<void>;
}

function ReferralCardLayout({
    data,
    isLoading,
    onProceed,
    onThankYou,
}: Readonly<ReferralCardLayoutProps>) {
    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{ borderColor: "var(--mantine-color-primary-4)", background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.08))" }}
        >
            <Stack gap="md">
                <ReferralHeader nextSpecialist={data.nextSpecialist} />
                <ReferralReason reason={data.reason} />
                <ReferralActions nextSpecialist={data.nextSpecialist} isLoading={isLoading} onProceed={onProceed} onThankYou={onThankYou} />
            </Stack>
        </Paper>
    );
}

export function ReferralCard({
    data,
    onConfirm,
    onThankYou,
    isLoading = false,
}: Readonly<ReferralCardProps>) {
    return (
        <ReferralCardLayout
            data={data}
            isLoading={isLoading}
            onProceed={onConfirm}
            onThankYou={onThankYou}
        />
    );
}

