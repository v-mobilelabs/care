import { Box, ScrollArea, SimpleGrid, Skeleton } from "@mantine/core";

export default function PrescriptionsLoading() {
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header skeleton */}
            <Box px={{ base: "md", sm: "xl" }} py="md" style={{ flexShrink: 0 }}>
                <Skeleton height={40} width={260} radius="md" />
            </Box>
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg">
                        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md">
                            {["a", "b", "c", "d", "e"].map((k) => (
                                <Skeleton key={k} height={260} radius="lg" />
                            ))}
                        </SimpleGrid>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
