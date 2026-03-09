import { Box, Group, ScrollArea, Skeleton, SimpleGrid, Stack } from "@mantine/core";

// ── iOS design tokens ─────────────────────────────────────────────────────────

const ios = {
    cardBg: "light-dark(#fff, #1c1c1e)",
    cardRadius: 14,
    cardShadow: "light-dark(0 0.5px 2px rgba(0,0,0,0.06), none)",
    pageBg: "light-dark(#f2f2f7, #000)",
    separator: "0.5px solid light-dark(#d1d1d6, #38383a)",
} as const;

// ── Record card skeleton ──────────────────────────────────────────────────────

function RecordCardSkeleton({ isLast = false }: Readonly<{ isLast?: boolean }>) {
    return (
        <Box
            style={{
                padding: "14px 16px",
                borderBottom: isLast ? "none" : ios.separator,
            }}
        >
            <Group justify="space-between" mb={8}>
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Stack gap={4}>
                        <Skeleton height={12} width={160} />
                        <Skeleton height={10} width={100} />
                    </Stack>
                </Group>
                <Group gap={6}>
                    <Skeleton height={22} width={64} radius="xl" />
                    <Skeleton circle h={22} w={22} />
                </Group>
            </Group>
        </Box>
    );
}

// ── Health records page loading skeleton ──────────────────────────────────────

export default function HealthRecordsLoading() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
                background: ios.pageBg,
            }}
        >
            {/* Header skeleton */}
            <Box
                px={{ base: "md", sm: "xl" }}
                pt="lg"
                pb="sm"
                style={{
                    flexShrink: 0,
                    background: "light-dark(rgba(242,242,247,0.85), rgba(0,0,0,0.85))",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                }}
            >
                <Box maw={800} mx="auto">
                    <Group gap="sm" mb="md">
                        <Skeleton width={40} height={40} radius={12} />
                        <Box>
                            <Skeleton height={16} width={130} mb={6} />
                            <Skeleton height={10} width={200} />
                        </Box>
                    </Group>

                    {/* Segmented control skeleton */}
                    <Skeleton height={32} radius="xl" />
                </Box>
            </Box>

            {/* Content skeleton */}
            <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
                <Stack gap="md" maw={800} mx="auto" px="xl" py="lg">
                    {/* Patient snapshot skeleton */}
                    <Skeleton height={148} radius={ios.cardRadius} />

                    {/* KPI grid */}
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={8}>
                        <Skeleton radius={ios.cardRadius} style={{ aspectRatio: "4 / 3" }} />
                        <Skeleton radius={ios.cardRadius} style={{ aspectRatio: "4 / 3" }} />
                        <Skeleton radius={ios.cardRadius} style={{ aspectRatio: "4 / 3" }} />
                        <Skeleton radius={ios.cardRadius} style={{ aspectRatio: "4 / 3" }} />
                    </SimpleGrid>

                    {/* Side-by-side card skeletons */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={8}>
                        <Skeleton height={130} radius={ios.cardRadius} />
                        <Skeleton height={130} radius={ios.cardRadius} />
                    </SimpleGrid>

                    {/* Record list skeleton */}
                    <Box style={{
                        borderRadius: ios.cardRadius,
                        background: ios.cardBg,
                        boxShadow: ios.cardShadow,
                        overflow: "hidden",
                    }}>
                        <RecordCardSkeleton />
                        <RecordCardSkeleton />
                        <RecordCardSkeleton isLast />
                    </Box>
                </Stack>
            </ScrollArea>
        </Box>
    );
}
