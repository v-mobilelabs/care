import { Box, Container, Skeleton, Stack } from "@mantine/core";

// ── Login page loading skeleton ───────────────────────────────────────────────

export default function LoginLoading() {
    return (
        <Box
            style={{
                minHeight: "100dvh",
                display: "flex",
                alignItems: "center",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
            }}
        >
            <Container size={420} w="100%">
                <Stack gap="xl" align="center">
                    {/* Icon + title + subtitle */}
                    <Stack gap={8} align="center">
                        <Skeleton circle h={40} w={40} />
                        <Skeleton height={22} width={200} />
                        <Skeleton height={8} width={300} />
                        <Skeleton height={8} width={260} />
                    </Stack>

                    {/* Form */}
                    <Stack gap="md" w="100%">
                        <Stack gap={6}>
                            <Skeleton height={8} width={60} />
                            <Skeleton height={36} radius="md" />
                        </Stack>
                        <Skeleton height={36} radius="md" />
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}
