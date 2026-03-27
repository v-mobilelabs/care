"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Paper } from "@mantine/core";
import type { DailyKpiDocument } from "@/data/encounters";

interface ChartProps {
  kpis: DailyKpiDocument[];
}

export function MetricsChart({ kpis }: Readonly<ChartProps>) {
  const data = [...kpis]
    .reverse()
    .map((kpi) => ({
      date: new Date(`${kpi.date}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      deflectionRate: Number(kpi.deflectionRate.toFixed(1)),
      satisfaction: Number((kpi.avgUserSatisfaction ?? 0).toFixed(2)),
    }));

  return (
    <Paper withBorder radius="lg" p="xl">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            label={{ value: "Deflection %", angle: -90, position: "insideLeft" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 5]}
            label={{ value: "Satisfaction", angle: 90, position: "insideRight" }}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="deflectionRate"
            stroke="var(--mantine-color-primary-6)"
            strokeWidth={2}
            name="Deflection Rate %"
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="satisfaction"
            stroke="var(--mantine-color-success-6)"
            strokeWidth={2}
            name="Avg Satisfaction (0-5)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
