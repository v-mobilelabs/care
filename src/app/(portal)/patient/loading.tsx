import { Box, Skeleton, Stack } from "@mantine/core";

export default function PatientLoading() {
  return (
    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
      <Stack gap="md">
        <Skeleton height={20} width="40%" />
        <Skeleton height={180} radius="lg" />
        <Skeleton height={180} radius="lg" />
      </Stack>
    </Box>
  );
}
