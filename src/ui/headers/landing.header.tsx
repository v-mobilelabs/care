"use client";
import { Button, Container, Group, Loader, Skeleton } from "@mantine/core";
import { IconMail, IconMailOpened } from "@tabler/icons-react";
import { Logo } from "../brand/logo";
import Link, { useLinkStatus } from "next/link";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ColorSchemeToggle = dynamic(
  () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton height={32} width={32} radius="xl" />,
  }
);

function AnimatedMailIcon() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setOpened((o) => !o), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{ position: "relative", display: "inline-flex", width: 15, height: 15 }}>
      <IconMail
        size={15}
        style={{
          position: "absolute",
          opacity: opened ? 0 : 1,
          transform: opened ? "rotateX(90deg) scale(0.8)" : "rotateX(0deg) scale(1)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      />
      <IconMailOpened
        size={15}
        style={{
          position: "absolute",
          opacity: opened ? 1 : 0,
          transform: opened ? "rotateX(0deg) scale(1)" : "rotateX(-90deg) scale(0.8)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      />
    </span>
  );
}

function StartAssessmentLabel() {
  const { pending } = useLinkStatus();
  if (pending) return <Loader size={14} />;
  return (
    <>
      <AnimatedMailIcon />
      {"\u00a0"}Start Assessment
    </>
  );
}

export function LandingHeader() {
  return (
    <Container px="md">
      <Group justify="space-between" align="center" h={64}>
        <Logo />
        <Group gap="xs">
          <Suspense fallback={<Skeleton height={36} width={36} radius="xl" />}>
            <ColorSchemeToggle />
          </Suspense>
          <Button
            color="primary"
            size="sm"
            radius="xl"
            component={Link}
            href="/patient/assistant"
          >
            <StartAssessmentLabel />
          </Button>
        </Group>
      </Group>
    </Container>
  );
}
