"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMetricsQuery } from "./_query";
import {
  AgentBreakdownCard,
  DeflectionRateCard,
  ResolutionTimeCard,
  SatisfactionCard,
} from "./_cards";
import { MetricsChart } from "./_chart";

interface MetricsContentProps {
  profileId: string;
  initialStartDate: string;
  initialEndDate: string;
}

export function MetricsContent({
  profileId,
  initialStartDate,
  initialEndDate,
}: Readonly<MetricsContentProps>) {
  const [startDate, setStartDate] = useState<string | null>(initialStartDate);
  const [endDate, setEndDate] = useState<string | null>(initialEndDate);

  const startDateIso = startDate ?? "";
  const endDateIso = endDate ?? "";

  const { data, isLoading, isFetching, error, refetch } = useMetricsQuery(
    profileId,
    startDateIso,
    endDateIso,
  );

  const kpis = data ?? [];

  function renderBody() {
    if (isLoading) {
      return (
        <Stack gap="md">
          <Group grow>
            <Skeleton height={120} radius="lg" />
            <Skeleton height={120} radius="lg" />
          </Group>
          <Group grow>
            <Skeleton height={120} radius="lg" />
            <Skeleton height={120} radius="lg" />
          </Group>
          <Skeleton height={320} radius="lg" />
        </Stack>
      );
    }

    if (error) {
      return (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="danger"
          title="Error loading metrics"
        >
          {(error as Error).message}
        </Alert>
      );
    }

    if (kpis.length === 0) {
      return (
        <Paper withBorder radius="lg" p="xl">
          <Text c="dimmed">No metrics found for the selected date range.</Text>
        </Paper>
      );
    }

    return (
      <>
        <Group grow>
          <DeflectionRateCard kpis={kpis} />
          <ResolutionTimeCard kpis={kpis} />
        </Group>
        <Group grow>
          <SatisfactionCard kpis={kpis} />
          <AgentBreakdownCard kpis={kpis} />
        </Group>
        <MetricsChart kpis={kpis} />
      </>
    );
  }

  return (
    <Stack gap="lg" p="xl">
      <Group align="flex-end">
        <DatePickerInput
          label="Start date"
          value={startDate}
          onChange={setStartDate}
          clearable={false}
        />
        <DatePickerInput
          label="End date"
          value={endDate}
          onChange={setEndDate}
          clearable={false}
        />
        <Button onClick={() => { refetch().catch(() => undefined); }} loading={isFetching}>
          Refresh
        </Button>
      </Group>

      <Box>{renderBody()}</Box>
    </Stack>
  );
}
