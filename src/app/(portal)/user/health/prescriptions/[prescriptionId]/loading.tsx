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

function LoadingBadges() {
    return (
        <Group gap={6}>
            <Skeleton h={22} w={120} radius="xl" />
            <Skeleton h={22} w={110} radius="xl" />
            <Skeleton h={22} w={130} radius="xl" />
        </Group>
    );
}

function LoadingMedRows() {
    return (
        <Stack gap="sm">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={72} radius="md" />)}
        </Stack>
    );
}

function LoadingCard() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="md">
            <Stack gap="sm">
                <LoadingBadges />
                <Skeleton h={14} w="75%" />
                <Skeleton h={14} w="60%" />
                <Divider />
                <LoadingMedRows />
            </Stack>
        </MotionCard>
    );
}

export default function PrescriptionDetailLoading() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <LoadingHeader />
                <LoadingCard />
            </Stack>
        </Container>
    );
}
