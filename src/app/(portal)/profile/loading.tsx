import { Box, Container, Skeleton, Stack } from "@mantine/core";

export default function ProfileLoading() {
    return (
        <Container pt="md">
            <Box maw={600} mx="auto">
                <Stack gap="md">
                    {/* Hero card skeleton */}
                    <Skeleton height={180} radius="lg" />
                    {/* Personal info section */}
                    <Skeleton height={200} radius="lg" />
                    {/* Location section */}
                    <Skeleton height={160} radius="lg" />
                    {/* Settings section */}
                    <Skeleton height={80} radius="lg" />
                </Stack>
            </Box>
        </Container>
    );
}
