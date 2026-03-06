"use client";
import { MantineProvider } from "@mantine/core";
import { theme } from "../theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { AnalyticsProvider } from "./analytics-provider";
import { QueryProvider } from "./query-provider";

export function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AnalyticsProvider>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        withCssVariables
        withGlobalClasses
      >
        <QueryProvider>
          <Notifications position="bottom-center" />
          <ModalsProvider>{children}</ModalsProvider>
        </QueryProvider>
      </MantineProvider>
    </AnalyticsProvider>
  );
}
