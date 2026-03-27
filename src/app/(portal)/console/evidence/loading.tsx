import { Group, Paper, Skeleton, Stack } from "@mantine/core";

export default function EvidenceLoading() {
  return (
    <Stack gap="lg" p="xl">
      <Group>
        <Skeleton height={40} width={220} />
        <Skeleton height={40} width={280} />
        <Skeleton height={40} width={280} />
        <Skeleton height={40} width={120} />
      </Group>
      <Paper withBorder radius="lg" p="xl">
        <Skeleton height={24} width="35%" mb="sm" />
        <Skeleton height={18} width="55%" mb="sm" />
        <Skeleton height={18} width="45%" mb="sm" />
        <Skeleton height={18} width="65%" />
      </Paper>
      <Paper withBorder radius="lg" p="xl">
        <Skeleton height={24} width="35%" mb="sm" />
        <Skeleton height={18} width="70%" mb="sm" />
        <Skeleton height={18} width="60%" mb="sm" />
        <Skeleton height={18} width="40%" />
      </Paper>
    </Stack>
  );
}
