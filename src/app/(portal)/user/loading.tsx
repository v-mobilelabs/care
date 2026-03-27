import { Box, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function PatientLoading() {
  return (
    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={1200} mx="auto">
      <Stack gap="xl">
        <Skeleton height={260} radius="lg" />

        <Stack gap="md">
          <Stack gap={6}>
            <Skeleton height={22} width={180} />
            <Skeleton height={14} width={320} />
          </Stack>

          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
            <Skeleton height={138} radius="lg" />
            <Skeleton height={138} radius="lg" />
            <Skeleton height={138} radius="lg" />
            <Skeleton height={138} radius="lg" />
          </SimpleGrid>
        </Stack>

        <Stack gap="md">
          <Stack gap={6}>
            <Skeleton height={22} width={220} />
            <Skeleton height={14} width={360} />
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
            <Skeleton height={170} radius="lg" />
            <Skeleton height={170} radius="lg" />
            <Skeleton height={170} radius="lg" />
          </SimpleGrid>
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <Skeleton height={210} radius="lg" />
          <Skeleton height={210} radius="lg" />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
