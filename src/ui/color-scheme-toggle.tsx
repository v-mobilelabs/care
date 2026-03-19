"use client";

import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const ICON_STYLE = { width: "65%", height: "65%" } as const;

export default function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ActionIcon
      onClick={() =>
        setColorScheme(computedColorScheme === "light" ? "dark" : "light")
      }
      variant="light"
      size="lg"
      aria-label="Toggle color scheme"
      radius="xl"
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          {computedColorScheme === "dark" ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <IconSun stroke={2.5} style={ICON_STYLE} />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <IconMoon stroke={2.5} style={ICON_STYLE} />
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <IconMoon stroke={2.5} style={ICON_STYLE} />
      )}
    </ActionIcon>
  );
}