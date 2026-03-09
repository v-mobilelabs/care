import { Box, Divider, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

// ── Accordion section skeleton ────────────────────────────────────────────────

function AccordionSectionSkeleton({ itemCount }: Readonly<{ itemCount: number }>) {
    return (
        <Box
            style={{
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                overflow: "hidden",
            }}
        >
            {/* Section header */}
            <Group
                gap="sm"
                p="md"
                style={{
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                }}
            >
                <Skeleton circle h={26} w={26} />
                <Skeleton height={10} width={120} />
            </Group>

            {/* Items */}
            <Stack gap={0} p="md">
                {Array.from({ length: itemCount }, (_, i) => `item-${i}`).map((k, pos) => (
                    <Box key={k}>
                        {pos > 0 && <Divider my={8} />}
                        <Group justify="space-between" py={4}>
                            <Skeleton height={9} width="65%" />
                            <Skeleton circle h={18} w={18} />
                        </Group>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

// ── FAQ page loading skeleton ─────────────────────────────────────────────────

export default function FaqLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="xl" maw={720} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Stack gap={6} align="center">
                    <Skeleton circle h={40} w={40} />
                    <Skeleton height={18} width={200} />
                    <Skeleton height={8} width={300} />
                </Stack>

                {/* Accordion sections */}
                <AccordionSectionSkeleton itemCount={3} />
                <AccordionSectionSkeleton itemCount={4} />
                <AccordionSectionSkeleton itemCount={3} />
                <AccordionSectionSkeleton itemCount={2} />
            </Stack>
        </ScrollArea>
    );
}
