import { Group, Paper, Skeleton, Stack } from "@mantine/core";

export default function MetricsLoading() {
  return (
    <Stack gap="lg" p="xl">
      <Group>
        <Skeleton height={40} width={180} />
        <Skeleton height={40} width={180} />
        <Skeleton height={40} width={110} />
      </Group>

      <Group grow>
        <Paper withBorder radius="lg" p="xl">
          <Skeleton height={18} width="45%" mb="sm" />
          <Skeleton height={30} width="60%" mb="sm" />
          <Skeleton height={18} width="40%" />
        </Paper>
        <Paper withBorder radius="lg" p="xl">
          <Skeleton height={18} width="45%" mb="sm" />
          <Skeleton height={30} width="60%" mb="sm" />
          <Skeleton height={18} width="40%" />
        </Paper>
      </Group>

      <Group grow>
        <Paper withBorder radius="lg" p="xl">
          <Skeleton height={18} width="45%" mb="sm" />
          <Skeleton height={30} width="60%" mb="sm" />
          <Skeleton height={18} width="40%" />
        </Paper>
        <Paper withBorder radius="lg" p="xl">
          <Skeleton height={18} width="45%" mb="sm" />
          <Skeleton height={20} mb="sm" />
          <Skeleton height={20} mb="sm" />
          <Skeleton height={20} />
        </Paper>
      </Group>

      <Paper withBorder radius="lg" p="xl">
        <Skeleton height={320} />
      </Paper>
    </Stack>
  );
}
