import { MotionCard } from "@/ui/components/motion-card";
import { Container, Divider, Group, Skeleton, Stack } from "@mantine/core";

function LoadingHeader() {
    return (
        <Group gap="sm" align="center">
            <Skeleton circle h={32} w={32} />
            <Skeleton h={22} w={220} radius="sm" />
        </Group>
    );
}

function LoadingMeta() {
    return (
        <Stack gap={6}>
            <Skeleton h={14} w="55%" />
            <Skeleton h={14} w="40%" />
            <Skeleton h={14} w="60%" />
        </Stack>
    );
}

function LoadingBadges() {
    return (
        <Group gap={6}>
            <Skeleton h={22} w={110} radius="xl" />
            <Skeleton h={22} w={110} radius="xl" />
            <Skeleton h={22} w={100} radius="xl" />
        </Group>
    );
}

function LoadingRows() {
    return (
        <Stack gap="xs">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={36} radius="sm" />)}
        </Stack>
    );
}

function LoadingCard() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="md">
            <Stack gap="sm">
                <LoadingMeta />
                <LoadingBadges />
                <Divider />
                <LoadingRows />
            </Stack>
        </MotionCard>
    );
}

export default function LabReportDetailLoading() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <LoadingHeader />
                <LoadingCard />
            </Stack>
        </Container>
    );
}
