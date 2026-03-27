import { Container, Skeleton, Stack } from "@mantine/core";

export default function MemoriesLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Skeleton height={36} radius="md" w={260} />
                <Skeleton height={58} radius="lg" />
                <Skeleton height={52} radius="lg" />
                <Skeleton height={104} radius="lg" />
                <Skeleton height={104} radius="lg" />
                <Skeleton height={104} radius="lg" />
            </Stack>
        </Container>
    );
}
