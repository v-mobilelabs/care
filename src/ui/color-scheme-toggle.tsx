"use client";

import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

export default function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <ActionIcon
      onClick={() =>
        setColorScheme(computedColorScheme === "light" ? "dark" : "light")
      }
      variant="subtle"
      size="md"
      aria-label="Toggle color scheme"
      radius="xl"
    >
      {computedColorScheme === "dark" ? (
        <IconSun stroke={1.5} style={{ width: "75%", height: "75%" }} />
      ) : (
        <IconMoon stroke={1.5} style={{ width: "75%", height: "75%" }} />
      )}
    </ActionIcon>
  );
}